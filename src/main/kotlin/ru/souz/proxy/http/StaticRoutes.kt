package ru.souz.proxy.http

import io.ktor.server.http.content.*
import io.ktor.server.routing.*
import java.io.File

fun Route.staticRoutes() {
    staticFiles("/", File("public")) {
        default("index.html")
    }

    get("{...}") {
        val path = call.request.path()
        if (
            path.startsWith("/auth/") ||
            path.startsWith("/v1/") ||
            path == "/healthz"
        ) return@get

        val file = File("public/index.html")
        if (file.exists()) {
            call.respondFile(file)
        }
    }
}
