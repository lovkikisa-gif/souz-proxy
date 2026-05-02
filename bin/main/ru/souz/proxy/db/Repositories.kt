package ru.souz.proxy.db

import java.sql.Connection
import java.sql.ResultSet
import java.util.UUID

data class User(
    val id: String,
    val username: String,
    val usernameNormalized: String,
    val passwordHash: String,
    val disabledAt: java.time.Instant?
)

data class WelcomeKey(
    val id: String,
    val keyHash: String,
    val usedAt: java.time.Instant?,
    val expiresAt: java.time.Instant?
)

data class Session(
    val id: String,
    val userId: String,
    val sessionHash: String,
    val expiresAt: java.time.Instant,
    val revokedAt: java.time.Instant?
)

class UserRepository(private val connection: Connection) {
    fun findByUsername(username: String): User? {
        val query = "SELECT * FROM users WHERE username_normalized = ?"
        connection.prepareStatement(query).use { stmt ->
            stmt.setString(1, username.trim().lowercase())
            stmt.executeQuery().use { rs ->
                if (rs.next()) return rs.toUser()
            }
        }
        return null
    }

    fun findById(id: String): User? {
        val query = "SELECT * FROM users WHERE id = ?::uuid"
        connection.prepareStatement(query).use { stmt ->
            stmt.setString(1, id)
            stmt.executeQuery().use { rs ->
                if (rs.next()) return rs.toUser()
            }
        }
        return null
    }

    fun insert(username: String, passwordHash: String): String {
        val query = """
            INSERT INTO users (username, username_normalized, password_hash)
            VALUES (?, ?, ?) RETURNING id
        """.trimIndent()
        connection.prepareStatement(query).use { stmt ->
            stmt.setString(1, username)
            stmt.setString(2, username.trim().lowercase())
            stmt.setString(3, passwordHash)
            stmt.executeQuery().use { rs ->
                if (rs.next()) return rs.getString("id")
            }
        }
        throw IllegalStateException("Failed to insert user")
    }
}

class WelcomeKeyRepository(private val connection: Connection) {
    fun findByKeyHashForUpdate(keyHash: String): WelcomeKey? {
        val query = "SELECT * FROM welcome_keys WHERE key_hash = ? FOR UPDATE"
        connection.prepareStatement(query).use { stmt ->
            stmt.setString(1, keyHash)
            stmt.executeQuery().use { rs ->
                if (rs.next()) return rs.toWelcomeKey()
            }
        }
        return null
    }

    fun markAsUsed(id: String, userId: String) {
        val query = "UPDATE welcome_keys SET used_at = now(), used_by_user_id = ?::uuid WHERE id = ?::uuid"
        connection.prepareStatement(query).use { stmt ->
            stmt.setString(1, userId)
            stmt.setString(2, id)
            stmt.executeUpdate()
        }
    }
}

class SessionRepository(private val connection: Connection) {
    fun insert(userId: String, sessionHash: String, ttlDays: Long, userAgent: String?, ipHash: String?) {
        val query = """
            INSERT INTO sessions (user_id, session_hash, expires_at, user_agent, ip_hash)
            VALUES (?::uuid, ?, now() + (? || ' days')::interval, ?, ?)
        """.trimIndent()
        connection.prepareStatement(query).use { stmt ->
            stmt.setString(1, userId)
            stmt.setString(2, sessionHash)
            stmt.setLong(3, ttlDays)
            stmt.setString(4, userAgent)
            stmt.setString(5, ipHash)
            stmt.executeUpdate()
        }
    }

    fun findBySessionHash(sessionHash: String): Session? {
        val query = "SELECT * FROM sessions WHERE session_hash = ?"
        connection.prepareStatement(query).use { stmt ->
            stmt.setString(1, sessionHash)
            stmt.executeQuery().use { rs ->
                if (rs.next()) return rs.toSession()
            }
        }
        return null
    }

    fun revoke(sessionHash: String) {
        val query = "UPDATE sessions SET revoked_at = now() WHERE session_hash = ?"
        connection.prepareStatement(query).use { stmt ->
            stmt.setString(1, sessionHash)
            stmt.executeUpdate()
        }
    }
}

fun ResultSet.toUser() = User(
    id = getString("id"),
    username = getString("username"),
    usernameNormalized = getString("username_normalized"),
    passwordHash = getString("password_hash"),
    disabledAt = getTimestamp("disabled_at")?.toInstant()
)

fun ResultSet.toWelcomeKey() = WelcomeKey(
    id = getString("id"),
    keyHash = getString("key_hash"),
    usedAt = getTimestamp("used_at")?.toInstant(),
    expiresAt = getTimestamp("expires_at")?.toInstant()
)

fun ResultSet.toSession() = Session(
    id = getString("id"),
    userId = getString("user_id"),
    sessionHash = getString("session_hash"),
    expiresAt = getTimestamp("expires_at").toInstant(),
    revokedAt = getTimestamp("revoked_at")?.toInstant()
)
