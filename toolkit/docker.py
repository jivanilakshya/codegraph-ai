"""Docker Compose command wrappers."""

from pathlib import Path
import subprocess


class DockerService:
    def __init__(self, compose_file: Path) -> None:
        self.compose_file = compose_file

    def run(self, *arguments: str) -> str:
        command = ["docker", "compose", "-f", str(self.compose_file), *arguments]
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        output = (result.stdout + result.stderr).strip()
        if result.returncode:
            raise RuntimeError(output or f"Docker exited with code {result.returncode}.")
        return output

    def status(self) -> str:
        return self.run("ps")

    def restart(self) -> str:
        return self.run("restart")

    def logs(self, service: str) -> str:
        return self.run("logs", "--tail", "100", service)
