# it-encyclopedia-media

Статические изображения для [энциклопедии «Вселенная IT»](https://spirzen.ru/).

Продакшен: **[assets.spirzen.ru](https://assets.spirzen.ru/)** (GitHub Pages, без сборки).

Главная — `public/index.html`: космическая витрина со случайными картинками из библиотеки. Список файлов — `public/media-manifest.json` (генерируется при деплое: `node scripts/generate-manifest.mjs`).

## Зачем отдельный репозиторий

Текст и SEO остаются в [`it-knowledge-base`](https://github.com/Spirzen/it-knowledge-base); длинный код — в [`it-code-examples`](https://github.com/Spirzen/it-code-examples); интерактив — в [`it-play`](https://github.com/Spirzen/it-play). Картинки не раздувают clone и билд Docusaurus.

## Структура путей

Иллюстрации статьи — путь от `docs/encyclopedia/` (без префикса `docs/encyclopedia`):

```
public/encyclopedia/<раздел>/<подраздел>/…/<имя-файла>.png
```

Примеры:

```
public/encyclopedia/4-code-dev/4-02-chto-takoe-kod-i-kak-on-rabotaet/617/media-pilot-test.png
public/encyclopedia/1-basics/1-08-kak-rabotaet-kompyuter/image-3.png
```

Общие диаграммы из бывшего `static/img/`:

```
public/encyclopedia/_shared/img/it-universe-architecture.png
```

URL в статье:

```markdown
![Описание](https://assets.spirzen.ru/encyclopedia/4-code-dev/4-02-chto-takoe-kod-i-kak-on-rabotaet/617/media-pilot-test.png)
![Архитектура](https://assets.spirzen.ru/encyclopedia/_shared/img/it-universe-architecture.png)
```

Миграция из `it-knowledge-base`: `node scripts/migrate-from-kb.mjs` (опция `--dry-run`).

## Деплой

Push в `main` → GitHub Actions → GitHub Pages.

DNS: `assets` CNAME → `spirzen.github.io`, в репозитории `public/CNAME` = `assets.spirzen.ru`.

## Локальный просмотр

Не открывайте `index.html` двойным кликом (`file://`) — пути `/encyclopedia/...` уйдут на диск `F:\encyclopedia\...`.

```bash
npx serve public -p 8788
# http://localhost:8788
```

## Рекомендации

- Предпочитайте **WebP** (меньше вес); PNG — для скриншотов с мелким текстом.
- Осмысленные имена файлов (`intellij-ui.webp`), не `image-1.png`.
- Всегда заполняйте **alt** в markdown.
- Исходники схем — `.drawio` в `it-knowledge-base/info/`, экспорт сюда.
