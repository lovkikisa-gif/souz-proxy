package ru.souz.proxy.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.flywaydb.core.Flyway
import java.sql.Connection
import javax.sql.DataSource

object DatabaseFactory {
    private lateinit var dataSource: HikariDataSource

    fun init(databaseUrl: String) {
        val config = HikariConfig().apply {
            if (databaseUrl.startsWith("postgres://")) {
                val uri = java.net.URI(databaseUrl)
                jdbcUrl = "jdbc:postgresql://${uri.host}:${uri.port}${uri.path}"
                uri.userInfo?.let { userInfo ->
                    username = userInfo.substringBefore(":")
                    password = userInfo.substringAfter(":")
                }
            } else {
                jdbcUrl = databaseUrl
            }
            driverClassName = "org.postgresql.Driver"
            maximumPoolSize = 10
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_READ_COMMITTED"
            validate()
        }
        
        dataSource = HikariDataSource(config)
        
        val flyway = Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .load()
            
        flyway.migrate()
    }

    fun <T> withConnection(block: (Connection) -> T): T {
        return dataSource.connection.use { conn ->
            val result = try {
                block(conn)
            } catch (e: Exception) {
                conn.rollback()
                throw e
            }
            conn.commit()
            result
        }
    }
}
