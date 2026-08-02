git pull origin docker-version

docker compose down

### Backup
### docker exec -t <container_name> pg_dump -U <db_user> <db_name> | gzip > /path/to/backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
docker exec -t 1239ec46d700 pg_dump -U postgres acme_erp | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

### Backup in windows for docker compose
docker exec <container_id> pg_dump -U postgres acme_erp | Out-File -Encoding utf8 backup.sql

### Restore in vps
gunzip -c backup.sql.gz | docker exec -i <container_name> psql -U <db_user> -d <db_name>
docker exec -t <container_name> pg_restore -U <db_user> -d <db_name> --clean --if-exists /path/to/backup/file.sql


### copy backup to windows
scp -P 20033 deploy@148.113.8.82:/home/deploy/backup/backup_20260802_053102.sql.gz D:\deploy\backups

### drop and recreate empty database
docker exec -i 767c162f19ef sh -c "dropdb -U postgres acme_erp && createdb -U postgres acme_erp"

### Restore in windows

Get-Content D:\deploy\backup_20260802_053102.sql | docker exec -i 767c162f19ef psql -U postgres -d acme_erp



docker compose up --build -d