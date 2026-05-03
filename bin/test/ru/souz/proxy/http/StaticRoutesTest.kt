package ru.souz.proxy.http

import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import java.nio.file.Files
import java.nio.file.Path

class StaticRoutesTest {
    @Test
    fun `app assets are served from public root`() = withStaticContent(
        mapOf(
            "public/index.html" to "<html><body>app-shell</body></html>",
            "public/assets/main.js" to "console.log('app')",
            "public-root/index.html" to "<html><body>root-shell</body></html>"
        )
    ) { staticContent ->
        testApplication {
            application {
                routing {
                    staticRoutes(
                        publicDir = staticContent.publicDir.toFile(),
                        publicRootDir = staticContent.publicRootDir.toFile()
                    )
                }
            }

            val response = client.get("/app/assets/main.js")

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals("console.log('app')", response.bodyAsText())
        }
    }

    @Test
    fun `app routes fall back to frontend index from public root`() = withStaticContent(
        mapOf(
            "public/index.html" to "<html><body>app-shell</body></html>",
            "public-root/index.html" to "<html><body>root-shell</body></html>"
        )
    ) { staticContent ->
        testApplication {
            application {
                routing {
                    staticRoutes(
                        publicDir = staticContent.publicDir.toFile(),
                        publicRootDir = staticContent.publicRootDir.toFile()
                    )
                }
            }

            val response = client.get("/app/settings")

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("app-shell"))
        }
    }

    @Test
    fun `onboarding route falls back to frontend index from public root`() = withStaticContent(
        mapOf(
            "public/index.html" to "<html><body>app-shell</body></html>",
            "public-root/index.html" to "<html><body>root-shell</body></html>"
        )
    ) { staticContent ->
        testApplication {
            application {
                routing {
                    staticRoutes(
                        publicDir = staticContent.publicDir.toFile(),
                        publicRootDir = staticContent.publicRootDir.toFile()
                    )
                }
            }

            val response = client.get("/app/onboarding")

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("app-shell"))
        }
    }

    @Test
    fun `health routes are not captured by app fallback`() = withStaticContent(
        mapOf(
            "public/index.html" to "<html><body>app-shell</body></html>",
            "public-root/index.html" to "<html><body>root-shell</body></html>"
        )
    ) { staticContent ->
        testApplication {
            application {
                routing {
                    staticRoutes(
                        publicDir = staticContent.publicDir.toFile(),
                        publicRootDir = staticContent.publicRootDir.toFile()
                    )
                }
            }

            val response = client.get("/healthz")

            assertEquals(HttpStatusCode.NotFound, response.status)
        }
    }

    private fun withStaticContent(files: Map<String, String>, block: (StaticContent) -> Unit) {
        val tempDir = Files.createTempDirectory("static-routes-test")
        files.forEach { (relativePath, contents) ->
            val target = tempDir.resolve(relativePath)
            target.parent.createDirectories()
            target.writeText(contents)
        }

        block(
            StaticContent(
                publicDir = tempDir.resolve("public"),
                publicRootDir = tempDir.resolve("public-root")
            )
        )
    }

    private data class StaticContent(
        val publicDir: Path,
        val publicRootDir: Path
    )
}
