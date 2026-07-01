import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.api.routes.auth import register, login, google_login, logout, UserRegister, UserLogin, GoogleLogin
from app.database.models import AppUser
from app.core.security import create_access_token, is_token_blacklisted, blacklist_token


async def test_get_db():
    print("Testing get_db generator...")
    generator = get_db()
    
    with patch("app.api.deps.async_session_maker") as mock_maker:
        mock_session = AsyncMock(spec=AsyncSession)
        mock_maker.return_value = mock_session
        
        # Advance generator to yield session
        yielded_session = await anext(generator)
        assert yielded_session == mock_session.__aenter__.return_value
        
        # Advance generator to trigger the finally block
        try:
            await anext(generator)
        except StopAsyncIteration:
            pass
            
        mock_session.__aenter__.return_value.close.assert_awaited_once()
    print("  => get_db test PASSED!")


async def test_get_current_user():
    print("Testing get_current_user...")
    db = AsyncMock(spec=AsyncSession)
    user = AppUser(id=10, name="Alice", email="alice@test.com", password_hash="hash")
    db.get.return_value = user

    # 1. Valid token happy path
    token = create_access_token({"sub": "10"})
    current_user = await get_current_user(token=token, db=db)
    assert current_user == user
    db.get.assert_awaited_once_with(AppUser, 10)
    print("  => Happy path PASSED!")

    # 2. Blacklisted token path
    blacklist_token(token)
    try:
        await get_current_user(token=token, db=db)
        assert False, "Should raise HTTP 401 for blacklisted token"
    except HTTPException as e:
        assert e.status_code == 401
        assert "Session has been invalidated" in e.detail
    print("  => Blacklist check PASSED!")

    # 3. Invalid token signature path
    try:
        await get_current_user(token="invalidtokenpayload.test.abc", db=db)
        assert False, "Should raise HTTP 401 for invalid JWT token"
    except HTTPException as e:
        assert e.status_code == 401
    print("  => Invalid token check PASSED!")

    # 4. User not found path
    db.get.return_value = None
    new_token = create_access_token({"sub": "99"})
    try:
        await get_current_user(token=new_token, db=db)
        assert False, "Should raise HTTP 401 when user is not found in database"
    except HTTPException as e:
        assert e.status_code == 401
    print("  => User not found check PASSED!")


async def test_register_route():
    print("Testing register endpoint...")
    db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    db.execute.return_value = mock_result
    
    # Case 1: Email already exists
    mock_result.scalars.return_value.first.return_value = AppUser(id=1, email="duplicate@test.com")
    reg_in = UserRegister(name="Test User", email="duplicate@test.com", password="password123")
    try:
        await register(reg_in, db)
        assert False, "Should block duplicate email"
    except HTTPException as e:
        assert e.status_code == 400
        assert "already registered" in e.detail
    print("  => Duplicate email block PASSED!")

    # Case 2: Successful registration
    mock_result.scalars.return_value.first.return_value = None
    reg_in_new = UserRegister(name="New User", email="new@test.com", password="password123")
    
    async def mock_refresh(user_obj):
        user_obj.id = 5
    db.refresh.side_effect = mock_refresh
    
    res = await register(reg_in_new, db)
    assert res["status"] == "success"
    assert res["message"] == "User registered successfully"
    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    print("  => User creation PASSED!")


async def test_login_route():
    print("Testing login endpoint...")
    db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    db.execute.return_value = mock_result
    
    # Case 1: User does not exist
    mock_result.scalars.return_value.first.return_value = None
    login_in = UserLogin(email="nonexistent@test.com", password="pwd")
    try:
        await login(login_in, db)
        assert False, "Should fail login for nonexistent user"
    except HTTPException as e:
        assert e.status_code == 401
    print("  => Nonexistent user login fail PASSED!")

    # Case 2: Wrong password
    from app.core.security import hash_password
    pwd_hash = hash_password("secret123")
    db_user = AppUser(id=1, email="test@test.com", password_hash=pwd_hash, auth_provider="local")
    mock_result.scalars.return_value.first.return_value = db_user
    
    login_in_wrong = UserLogin(email="test@test.com", password="wrongpassword")
    try:
        await login(login_in_wrong, db)
        assert False, "Should fail login for wrong password"
    except HTTPException as e:
        assert e.status_code == 401
    print("  => Wrong password login fail PASSED!")

    # Case 3: Successful login
    login_in_ok = UserLogin(email="test@test.com", password="secret123")
    res = await login(login_in_ok, db)
    assert "access_token" in res
    assert res["token_type"] == "bearer"
    print("  => Successful login PASSED!")


async def test_google_login_route():
    print("Testing google_login endpoint...")
    db = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    db.execute.return_value = mock_result
    
    with patch("app.api.routes.auth.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {"email": "googleuser@test.com", "name": "Google User"}
        
        # Case 1: Existing Google User login
        existing_google_user = AppUser(id=20, email="googleuser@test.com", auth_provider="google")
        mock_result.scalars.return_value.first.return_value = existing_google_user
        
        payload = GoogleLogin(id_token="mock_id_token")
        res = await google_login(payload, db)
        assert "access_token" in res
        print("  => Existing Google login PASSED!")
        
        # Case 2: New Google User auto-registration
        mock_result.scalars.return_value.first.return_value = None
        db.add.reset_mock()
        db.commit.reset_mock()
        
        async def mock_refresh(user_obj):
            user_obj.id = 21
        db.refresh.side_effect = mock_refresh
        
        res = await google_login(payload, db)
        assert "access_token" in res
        db.add.assert_called_once()
        db.commit.assert_awaited_once()
        print("  => Auto-register Google login PASSED!")
        

async def test_logout_route():
    print("Testing logout endpoint...")
    user = AppUser(id=1, email="test@test.com")
    token = "some_active_bearer_token"
    
    res = await logout(current_user=user, token=token)
    assert res["message"] == "Successfully logged out"
    assert is_token_blacklisted(token)
    print("  => Logout token blacklist PASSED!")


async def main():
    await test_get_db()
    await test_get_current_user()
    await test_register_route()
    await test_login_route()
    await test_google_login_route()
    await test_logout_route()
    print("\nAll User State and Auth API Router tests PASSED!")


if __name__ == "__main__":
    asyncio.run(main())
