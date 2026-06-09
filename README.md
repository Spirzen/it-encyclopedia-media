# it-encyclopedia-media

Статические изображения для [энциклопедии «Вселенная IT»](https://spirzen.ru/).

Продакшен: **[assets.spirzen.ru](https://assets.spirzen.ru/)** (GitHub Pages, без сборки).

Главная — `public/index.html`: космическая витрина со случайными картинками из библиотеки. Список файлов — `public/media-manifest.json` (генерируется при деплое: `node scripts/generate-manifest.mjs`).

## Зачем отдельный репозиторий

Текст и SEO остаются в [`it-knowledge-base`](https://github.com/Spirzen/it-knowledge-base); длинный код — в [`it-code-examples`](https://github.com/Spirzen/it-code-examples); интерактив — в [`it-play`](https://github.com/Spirzen/it-play). Картинки не раздувают clone и билд Docusaurus.

## Структура путей

Повторяем путь статьи в энциклопедии:

```
public/encyclopedia/<раздел>/<подраздел>/<id>/<имя-файла>.webp
```

Пример (пилот):

```
public/encyclopedia/4-code-dev/4-02-chto-takoe-kod-i-kak-on-rabotaet/617/media-pilot-test.png
```

URL в статье:

```markdown
![Описание](https://assets.spirzen.ru/encyclopedia/4-code-dev/4-02-chto-takoe-kod-i-kak-on-rabotaet/617/media-pilot-test.png)
```

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
