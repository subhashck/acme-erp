git pull origin docker-version

docker compose down

### Backup
### docker exec -t <container_name> pg_dump -U <db_user> <db_name> | gzip > /path/to/backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
docker exec -t acme-erp-db pg_dump -U postgres acme_erp | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

### Backup in windows for docker compose
docker exec acme-erp-db pg_dump -U postgres acme_erp | Out-File -Encoding utf8 backup.sql

### Restore in vps
gunzip -c backup.sql.gz | docker exec -i acme-erp-db psql -U <db_user> -d <db_name>
docker exec -t acme-erp-db pg_restore -U <db_user> -d <db_name> --clean --if-exists /path/to/backup/file.sql


### copy backup to windows
scp -P 20019 deploy@148.113.6.25:/home/deploy/backup/backup_20260904_145800.sql.gz  D:\deploy\backups

### drop and recreate empty database
docker exec -i acme-erp-db sh -c "dropdb -U postgres acme_erp && createdb -U postgres acme_erp"

### Restore in windows

Get-Content D:\deploy\backups\backup_20260806_085435.sql | docker exec -i acme-erp-db psql -U postgres -d acme_erp



docker compose up --build -d


### execute commands inside docker container
docker exec -it acme-erp-web sh