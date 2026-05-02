package ru.souz.proxy.auth

import kotlinx.serialization.Serializable

@Serializable
data class VerifyWelcomeKeyRequest(val welcomeKey: String)

@Serializable
data class VerifyWelcomeKeyResponse(val valid: Boolean)

@Serializable
data class SignupRequest(
    val welcomeKey: String,
    val username: String,
    val password: String,
    val confirmPassword: String
)

@Serializable
data class LoginRequest(
    val username: String,
    val password: String
)

@Serializable
data class AuthUserDto(
    val id: String,
    val username: String
)

@Serializable
data class AuthResponse(
    val user: AuthUserDto
)

class AuthResponseWithCookie(
    val user: AuthUserDto,
    val rawSessionToken: String
)

@Serializable
data class SimpleSuccessResponse(val ok: Boolean)
