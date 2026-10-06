# ApexMain — сайт агентства

Astro 7 · TypeScript · Tailwind 4 · GSAP + ScrollTrigger · Remotion (ролики). Публикуется на GitHub Pages:
https://mikhail-pracovnik.github.io/apexmain-site/

## Команды

```bash
npm install
npm run dev          # http://localhost:4321/apexmain-site/
npm run build        # сборка в dist/
npm run check        # проверка типов
npm run check:names  # проверка на названия сторонних компаний (staged-файлы; --all — весь репозиторий)
```

Хук перед коммитом включается один раз: `git config core.hooksPath .githooks`.
Локальный список запрещённых названий — `.names-denylist.txt` (в git не попадает).

## Где что лежит

| Что | Где |
|---|---|
| Флаги сайта: демо-режим (noindex), контакты, ID аналитики, реквизиты | `src/config/site.ts` |
| Все тексты интерфейса на трёх языках | `src/i18n/ru.json`, `kk.json`, `en.json` |
| Услуги (один файл = одна услуга) | `src/content/services/*.yaml` |
| Примеры (один файл = один пример) | `src/content/examples/*.yaml` |
| Ниши (фильтр и форма) | `src/content/niches.yaml` |
| Фразы «С чем приходят» | `src/content/pains.yaml` |
| Цитаты в подвале (только проверенные, с источниками) | `src/content/quotes.yaml` |
| Знак (координаты) | `src/data/brand-mark.json` |
| Отправка заявки | `src/lib/lead/` |

### Добавить услугу
Скопировать любой файл из `src/content/services/`, переименовать, поменять тексты. Код трогать не нужно.
`priceFrom: 250000` покажет «от 250 000 ₸», `null` — «цена после разбора». `hidden: true` скрывает услугу.

### Заменить болванку примера реальным макетом
Положить картинки в `public/media/examples/` и вписать пути в `images.desktop` / `images.mobile`
нужного файла в `src/content/examples/`. Ролик — в `video` (WebM + MP4 + постер). Пока файлов нет,
сайт рисует фирменную болванку.

### Открыть сайт для поисковиков
`demo: false` в `src/config/site.ts` — уберёт `noindex` со страниц и откроет robots.txt.

### Аналитика
Вписать `googleAnalyticsId` и/или `metaPixelId` в `src/config/site.ts`. Появится баннер согласия;
скрипты загружаются только после «Разрешить».

### Заявки через бота
Сейчас форма открывает Telegram/WhatsApp с готовым текстом (сервера на GitHub Pages нет).
Чтобы перейти на бота: реализовать `LeadSender` (POST в серверную функцию, где хранится токен)
и вернуть его из `getSender()` в `src/lib/lead/index.ts`. Токен в репозиторий не класть.

## Публикация
Сейчас: `npm run deploy` — собирает сайт и отправляет `dist/` в ветку `gh-pages`
(GitHub Pages → Deploy from a branch → `gh-pages`).

Автоматическая публикация при каждом push в `main` уже подготовлена в `.github/deploy.yml.disabled`.
Чтобы включить: `gh auth refresh -s workflow`, затем
`git mv .github/deploy.yml.disabled .github/workflows/deploy.yml`, push, и в настройках Pages
выбрать Source: GitHub Actions.

## Шрифты
Geologica (заголовки), Onest (текст), IBM Plex Mono (метки) — OFL. Подмножества с латиницей,
кириллицей и казахскими буквами собираются скриптом `npm run fonts` из `fonts-src/`
(исходные TTF в git не хранятся, берутся из репозитория Google Fonts).

## Ролики (Remotion)
Проект в `video/`. `cd video && npm install && node scripts/render-all.mjs` — рендерит все ролики
в `public/media/` (WebM + MP4 + постер, каждый до 500 КБ).
Лицензия Remotion: бесплатно для частных лиц и компаний до 3 сотрудников, иначе нужна Company License
(https://www.remotion.pro/license).

## Картинки бренда
`python scripts/make-brand-assets.py` пересобирает SVG знака, favicon, иконки и OG-картинки из `src/data/brand-mark.json`.
