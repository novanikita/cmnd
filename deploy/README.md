# Preview / staging (flowerdog.studio)

Схема деплоя для статического сайта из GitHub.

## Ветки

| Ветка | Назначение | Деплой |
|-------|------------|--------|
| `main` | Production, публичный сайт | GitHub Pages → `flowerdog.studio` |
| `preview` | Staging для клиента | GitHub Pages environment `preview` + **Basic Auth на nginx** |

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

## Важно про Basic Auth

**GitHub Pages не умеет пароль на вход.** Файлы можно выложить через Actions, но защита «логин + пароль в браузере» делается **перед** Pages:

- nginx + `.htpasswd` (рекомендуется, см. ниже), или
- Cloudflare Access на поддомен `preview.flowerdog.studio`

Клиенту достаточно ссылки и пары логин/пароль — GitHub не нужен.

## Структура

```
main branch          →  build-production.sh  →  flowerdog.studio (публично)
preview branch       →  prepare-preview.sh   →  preview.flowerdog.studio (nginx + пароль)
                                              или flowerdog.studio/preview
```

### Что делает preview-сборка

Скрипт [`scripts/prepare-preview.sh`](../scripts/prepare-preview.sh):

1. Копирует сайт в `_site` (без `.git`, `deploy`, `CNAME` и т.д.)
2. Кладёт [`robots.preview.txt`](../robots.preview.txt) как `robots.txt` (`Disallow: /`)
3. В каждый `*.html` в корне добавляет:

   ```html
   <meta name="robots" content="noindex,nofollow">
   ```

Production использует [`robots.production.txt`](../robots.production.txt) (`Allow: /`).

## Настройка GitHub

1. **Settings → Pages → Build and deployment → Source:** `GitHub Actions`
2. Environment **`github-pages`** (ветка `main`) — custom domain: `flowerdog.studio`
3. Environment **`preview`** (ветка `preview`) — custom domain: `preview.flowerdog.studio` (опционально, если DNS на Pages)
4. Создать ветку `preview`:  
   `git checkout -b preview && git push -u origin preview`

После push в `preview` в Actions появится URL деплоя (environment `preview`).

## DNS (поддомен preview)

```
preview.flowerdog.studio  →  A/AAAA вашего сервера с nginx
```

или CNAME на GitHub Pages preview URL, **если** пароль ставите через Cloudflare, а не nginx.

## nginx + Basic Auth

### 1. Сгенерировать `.htpasswd`

На сервере (логин для клиента, например `client`):

```bash
sudo apt install apache2-utils   # debian/ubuntu
sudo htpasswd -c /etc/nginx/.htpasswd client
```

Добавить второго пользователя (без `-c`, чтобы не перезаписать файл):

```bash
sudo htpasswd /etc/nginx/.htpasswd another_user
```

Без `htpasswd` (одна строка вручную):

```bash
echo "client:$(openssl passwd -apr1 'YOUR_STRONG_PASSWORD')" | sudo tee /etc/nginx/.htpasswd
sudo chmod 640 /etc/nginx/.htpasswd
sudo chown root:www-data /etc/nginx/.htpasswd
```

Пароль храните в менеджере паролей, **не коммитьте** `.htpasswd` в git.

### 2. Выложить файлы preview на сервер

Пример после сборки локально или из CI:

```bash
bash scripts/prepare-preview.sh /tmp/flowerdog-preview
sudo rsync -av --delete /tmp/flowerdog-preview/ /var/www/flowerdog-preview/
```

Можно автоматизировать SSH-deploy из GitHub Actions (secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`).

### 3. Подключить конфиг

**Вариант A — поддомен** [`nginx-preview-subdomain.conf`](nginx-preview-subdomain.conf):

- `https://preview.flowerdog.studio`
- `root /var/www/flowerdog-preview;`

**Вариант B — путь** [`nginx-preview-path.conf`](nginx-preview-path.conf):

- `https://flowerdog.studio/preview/`
- `alias /var/www/flowerdog-preview/;`

Проверка и reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Проверка, что preview закрыт от индексации

1. Открыть preview без логина — должен быть **401** (nginx).
2. После входа — в `<head>` есть `noindex,nofollow`.
3. `https://preview.../robots.txt` → `Disallow: /`
4. Заголовок ответа: `X-Robots-Tag: noindex, nofollow` (если включён в nginx).

## Ссылка для клиента

Отправить:

- URL: `https://preview.flowerdog.studio` (или `/preview/`)
- Логин / пароль из `.htpasswd`

Обновление staging: push в ветку `preview` → пересборка → rsync на сервер (если не настроен auto-deploy).

## Production остаётся публичным

Ветка `main` не получает `noindex`. `robots.txt` на production разрешает обход (`Allow: /`).

`CNAME` с `flowerdog.studio` деплоится только с `main` (в preview-сборке `CNAME` исключён).
