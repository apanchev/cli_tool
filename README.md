# Project description

Simple CLI registrer tool using NodeJS + Redis.

The tool inserts in real time user inputs in database.

If the process is stopped and relaunched, it prints previous answered questions with their results and continues the formular.

# Requirements

- Nothing running on port 6379
- NodeJS installed (ver. > 16)
- Docker installed (ver. > 20)
- docker-compose installed (ver. > 1.29)

# Start project
```bash
npm run start-prod
```
Use this command to start the project, it will run the `docker_start.sh` located in `scripts` folder.

This script:
- Runs a `docker-compose up`
- Connects to the container using `docker exec` & runs the project
