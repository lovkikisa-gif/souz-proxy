package ru.souz.proxy.deploy

import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import java.nio.file.Path

class DeploymentArtifactsTest {
    private val repoRoot: Path = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize()

    @Test
    fun `dockerfile builds bundled frontend into public root`() {
        val dockerfile = read("Dockerfile")

        assertTrue(
            dockerfile.contains("COPY frontend/ ./"),
            "Dockerfile should build the frontend shipped inside this repository."
        )
        assertTrue(
            dockerfile.contains("COPY --from=frontend-build /frontend/dist ./public"),
            "Dockerfile should place the built frontend directly into /app/public."
        )
        assertTrue(
            !dockerfile.contains("./public/app"),
            "Dockerfile should no longer copy the frontend into /app/public/app."
        )
    }

    @Test
    fun `development compose keeps dev defaults`() {
        val devCompose = read("docker-compose.dev.yml")

        assertTrue(devCompose.contains("PUBLIC_BASE_URL: \"http://localhost:8080\""))
        assertTrue(devCompose.contains("COOKIE_SECURE: \"false\""))
        assertTrue(devCompose.contains("ENV: \"development\""))
        assertTrue(!devCompose.contains("additional_contexts:"))
    }

    @Test
    fun `production compose exposes only web proxy and requires prod secrets`() {
        val prodCompose = read("deploy/docker-compose.prod.yml")
        val portsBlocks = Regex("^\\s*ports:\\s*$", RegexOption.MULTILINE).findAll(prodCompose).count()

        assertEquals(1, portsBlocks, "Only web-proxy should publish host ports in production compose.")
        assertTrue(prodCompose.contains("127.0.0.1:\${HOST_PROXY_PORT:-8080}:8080"))
        assertTrue(!prodCompose.contains("internal: true"))
        assertTrue(prodCompose.contains("\${SOUZ_BACKEND_PROXY_TOKEN:?"))
        assertTrue(prodCompose.contains("\${SOUZ_MASTER_KEY:?"))
        assertTrue(prodCompose.contains("\${SESSION_HASH_SECRET:?"))
        assertTrue(prodCompose.contains("\${WELCOME_KEY_SECRET:?"))
        assertTrue(prodCompose.contains("\${PROXY_DB_PASSWORD:?"))
        assertTrue(prodCompose.contains("\${BACKEND_DB_PASSWORD:?"))
        assertTrue(prodCompose.contains("SOUZ_FEATURE_WS_EVENTS: \"\${SOUZ_FEATURE_WS_EVENTS:-true}\""))
        assertTrue(prodCompose.contains("SOUZ_FEATURE_STREAMING_MESSAGES: \"\${SOUZ_FEATURE_STREAMING_MESSAGES:-true}\""))
        assertTrue(prodCompose.contains("SOUZ_FEATURE_TOOL_EVENTS: \"\${SOUZ_FEATURE_TOOL_EVENTS:-true}\""))
        assertTrue(prodCompose.contains("SOUZ_FEATURE_OPTIONS: \"\${SOUZ_FEATURE_OPTIONS:-true}\""))
        assertTrue(prodCompose.contains("SOUZ_FEATURE_DURABLE_EVENT_REPLAY: \"\${SOUZ_FEATURE_DURABLE_EVENT_REPLAY:-true}\""))
    }

    @Test
    fun `deploy helpers document bundle export and production startup`() {
        assertFileContains("deploy/.env.example", "SOUZ_MASTER_KEY=replace_me_long_random_value")
        assertFileContains("deploy/.env.example", "# COOKIE_NAME=souz_session")
        assertFileContains("deploy/.env.example", "# SOUZ_BACKEND_DB_SCHEMA=public")
        assertFileContains("deploy/.env.example", "# OPENAI_API_KEY=")
        assertFileContains("deploy/.env.example", "# QWEN_KEY=")
        assertFileContains("deploy/.env.example", "# AITUNNEL_KEY=")
        assertFileContains("deploy/README.md", "docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d")
        assertFileContains("deploy/README.md", "./deploy/deploy-vm.sh")
        assertFileContains("deploy/README.md", "Do not rotate SOUZ_MASTER_KEY without a key migration plan.")
        assertFileContains("deploy/build-images.sh", "docker build")
        assertFileContains("deploy/export-images.sh", "load-and-run.sh")
        assertFileContains("deploy/smoke-test.sh", "Check backend health from proxy container")
        assertFileContains("deploy/create-welcome-key.md", "./hash-welcome-key.sh")
        assertFileContains("deploy/VPS.md", "reverse_proxy 127.0.0.1:8080")
    }

    @Test
    fun `vm deploy automation ships dedicated config and remote bootstrap scripts`() {
        assertFileContains("deploy/common.sh", "load_env_file()")
        assertFileContains("deploy/deploy.env.example", "DEPLOY_HOST=")
        assertFileContains("deploy/deploy.env.example", "REMOTE_APP_DIR=/opt/souz")
        assertFileContains("deploy/deploy.env.example", "BUILD_IMAGES_LOCALLY=true")
        assertFileContains("deploy/deploy-vm.sh", "build-images.sh")
        assertFileContains("deploy/deploy-vm.sh", "export-images.sh")
        assertFileContains("deploy/deploy-vm.sh", "scp")
        assertFileContains("deploy/deploy-vm.sh", "ssh")
        assertFileContains("deploy/deploy-vm.sh", "remote-bootstrap-vm.sh")
        assertFileContains("deploy/remote-bootstrap-vm.sh", "load-and-run.sh")
        assertFileContains("deploy/remote-bootstrap-vm.sh", "docker compose --env-file .env -f docker-compose.prod.yml ps")
    }

    private fun assertFileContains(relativePath: String, needle: String) {
        val path = repoRoot.resolve(relativePath)
        assertTrue(path.exists(), "$relativePath should exist.")
        assertTrue(path.readText().contains(needle), "$relativePath should contain: $needle")
    }

    private fun read(relativePath: String): String {
        val path = repoRoot.resolve(relativePath)
        assertTrue(path.exists(), "$relativePath should exist.")
        return path.readText()
    }
}
