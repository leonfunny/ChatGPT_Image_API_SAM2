import logging
from logging import Logger

LOG_FOLDER = "logs"


class CustomLogger:
    def __init__(self, name, log_dir=LOG_FOLDER, level=logging.INFO):
        self.logger: Logger = logging.getLogger(name)
        self.logger.setLevel(level)

        formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
        )

        # Create file handler
        log_file = f"{log_dir}/{logging.getLevelName(level)}.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        file_handler.suffix = "%Y-%m-%d"

        # Create console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)

        # Add handlers to the logger
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def get_logger(self) -> Logger:
        return self.logger
