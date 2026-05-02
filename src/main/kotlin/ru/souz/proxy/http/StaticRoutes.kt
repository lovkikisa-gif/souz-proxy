package ru.souz.proxy.http

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.http.content.*
import java.io.File
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.staticRoutes() {
    staticFiles("/", File("public")) {
        default("index.html")
    }

    get("{...}") {
        val path = call.request.path()
        if (path.startsWith("/agent")) {
            call.respond(HttpStatusCode.NotFound)
            return@get
        }
        if (
            path.startsWith("/auth/") ||
            path.startsWith("/v1/") ||
            path == "/health" ||
            path == "/healthz" ||
            path == "/ready" ||
            path == "/readyz"
        ) return@get

        val file = File("public/index.html")
        if (file.exists()) {
            call.respondFile(file)
        }
    }
}
