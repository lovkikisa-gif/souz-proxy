package ru.souz.proxy.app

import io.ktor.server.engine.*
import io.ktor.server.netty.*
import ru.souz.proxy.auth.AuthService
import ru.souz.proxy.db.DatabaseFactory

fun main() {
    val config = ProxyConfig.fromEnv()

    DatabaseFactory.init(config.databaseUrl)
    val authService = AuthService(config)

    embeddedServer(Netty, host = config.host, port = config.port) {
        proxyModule(config, authService)
    }.start(wait = true)
}
