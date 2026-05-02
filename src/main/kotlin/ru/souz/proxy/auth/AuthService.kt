package ru.souz.proxy.auth

import ru.souz.proxy.app.ProxyConfig
import ru.souz.proxy.db.*
import java.time.Instant

class AuthException(val code: String, message: String) : RuntimeException(message)

class AuthService(private val config: ProxyConfig) {

    fun verifyWelcomeKey(rawKey: String): Boolean {
        val keyHash = TokenHasher.hashWelcomeKey(config.welcomeKeySecret, rawKey)
        return DatabaseFactory.withConnection { conn ->
            val repo = WelcomeKeyRepository(conn)
            // For simple verification we can use forUpdate query since we just want to read.
            // Actually, we don't need forUpdate here, but we can reuse the method. 
            // Better to write a simple check or use the existing one and discard transaction.
            val key = repo.findByKeyHashForUpdate(keyHash)
            key != null && key.usedAt == null && (key.expiresAt == null || key.expiresAt.isAfter(Instant.now()))
        }
    }

    fun signup(req: SignupRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie {
        val keyHash = TokenHasher.hashWelcomeKey(config.welcomeKeySecret, req.welcomeKey)
        
        return DatabaseFactory.withConnection { conn ->
            val welcomeRepo = WelcomeKeyRepository(conn)
            val userRepo = UserRepository(conn)
            val sessionRepo = SessionRepository(conn)

            val welcomeKey = welcomeRepo.findByKeyHashForUpdate(keyHash)
                ?: throw AuthException("invalid_welcome_key", "Welcome key is invalid, expired or already used.")

            if (welcomeKey.usedAt != null) {
                throw AuthException("invalid_welcome_key", "Welcome key is invalid, expired or already used.")
            }
            if (welcomeKey.expiresAt != null && welcomeKey.expiresAt.isBefore(Instant.now())) {
                throw AuthException("invalid_welcome_key", "Welcome key is invalid, expired or already used.")
            }

            if (userRepo.findByUsername(req.username) != null) {
                throw AuthException("username_taken", "Username is already taken.")
            }

            val passwordHash = PasswordHasher.hash(req.password)
            val userId = userRepo.insert(req.username, passwordHash)

            welcomeRepo.markAsUsed(welcomeKey.id, userId)

            val rawSessionToken = TokenHasher.generateRandomToken()
            val sessionHash = TokenHasher.hashSessionToken(config.sessionHashSecret, rawSessionToken)

            sessionRepo.insert(userId, sessionHash, config.sessionTtlDays, userAgent, ipHash)

            AuthResponseWithCookie(
                user = AuthUserDto(id = userId, username = req.username),
                rawSessionToken = rawSessionToken
            )
        }
    }

    fun login(req: LoginRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie {
        return DatabaseFactory.withConnection { conn ->
            val userRepo = UserRepository(conn)
            val sessionRepo = SessionRepository(conn)

            val user = userRepo.findByUsername(req.username)
                ?: throw AuthException("invalid_credentials", "Invalid username or password.")

            if (!PasswordHasher.verify(req.password, user.passwordHash)) {
                throw AuthException("invalid_credentials", "Invalid username or password.")
            }

            if (user.disabledAt != null) {
                throw AuthException("invalid_credentials", "Invalid username or password.")
            }

            val rawSessionToken = TokenHasher.generateRandomToken()
            val sessionHash = TokenHasher.hashSessionToken(config.sessionHashSecret, rawSessionToken)

            sessionRepo.insert(user.id, sessionHash, config.sessionTtlDays, userAgent, ipHash)

            AuthResponseWithCookie(
                user = AuthUserDto(id = user.id, username = user.username),
                rawSessionToken = rawSessionToken
            )
        }
    }

    fun logout(rawSessionToken: String) {
        val sessionHash = TokenHasher.hashSessionToken(config.sessionHashSecret, rawSessionToken)
        DatabaseFactory.withConnection { conn ->
            SessionRepository(conn).revoke(sessionHash)
        }
    }

    fun getMe(rawSessionToken: String): AuthUserDto {
        val sessionHash = TokenHasher.hashSessionToken(config.sessionHashSecret, rawSessionToken)
        return DatabaseFactory.withConnection { conn ->
            val session = SessionRepository(conn).findBySessionHash(sessionHash)
                ?: throw AuthException("unauthorized", "Authentication required.")

            if (session.revokedAt != null || session.expiresAt.isBefore(Instant.now())) {
                throw AuthException("unauthorized", "Authentication required.")
            }

            val user = UserRepository(conn).findById(session.userId)
                ?: throw AuthException("unauthorized", "Authentication required.")

            if (user.disabledAt != null) {
                throw AuthException("unauthorized", "Authentication required.")
            }

            AuthUserDto(id = user.id, username = user.username)
        }
    }

    fun getUserIdBySessionToken(rawSessionToken: String): String? {
        val sessionHash = TokenHasher.hashSessionToken(config.sessionHashSecret, rawSessionToken)
        return DatabaseFactory.withConnection { conn ->
            val session = SessionRepository(conn).findBySessionHash(sessionHash) ?: return@withConnection null
            if (session.revokedAt != null || session.expiresAt.isBefore(Instant.now())) return@withConnection null
            val user = UserRepository(conn).findById(session.userId) ?: return@withConnection null
            if (user.disabledAt != null) return@withConnection null
            user.id
        }
    }
}
