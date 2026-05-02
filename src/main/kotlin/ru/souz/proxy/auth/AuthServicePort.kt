package ru.souz.proxy.auth

interface AuthServicePort {
    fun verifyWelcomeKey(rawKey: String): Boolean

    fun signup(req: SignupRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie

    fun login(req: LoginRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie

    fun logout(rawSessionToken: String)

    fun getMe(rawSessionToken: String): AuthUserDto

    fun getUserIdBySessionToken(rawSessionToken: String): String?
}
