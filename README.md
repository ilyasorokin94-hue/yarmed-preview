# yarmed-preview

Тестовые макеты сайта yarmed.com для согласования с клиентом. Страницы закрыты от поисковиков.

Файлы собираются скриптом `preview/publish_pages.py` из репозитория `yarmed-site`, здесь их руками не правим.

- Корень сайта (`index.html`, картинки и фильм в `start/` и `home-v4-film/`): стартовая страница для клиента. С 12.11.2026 это итоговая главная из набора `sh0-he5-bt0-ct0-bn0-ht3-kt3-sv0-pr2-of0-fm2-ft0`: в yarmed-site `python3 preview/varianty-3/build.py --final НАБОР`, результат `preview/start-3/index.html` (ветка `claude/glavnaya-varianty-2`).
  С 13.11.2026 (по слову Ильи) это главная по отзыву Ксении: в yarmed-site `python3 preview/pravki-7/build.py`, результат `preview/start-7/` (index.html и 15 страниц разделов). При переносе `../start/` и `../home-v4-film/` заменяются на `start/` и `home-v4-film/`, к index.html добавляется заголовок документа.
- [Прежняя стартовая страница от 13.11.2026, до отзыва Ксении](glavnaya-13-11.html)
- [Прежняя стартовая страница от 12.11.2026](glavnaya-12-11.html)
- [Прежняя стартовая страница от 11.11.2026](glavnaya-11-11.html)
- [Список макетов](maketi.html)
- [Главная v5: фильм + стилистика Dexellence](home-v5/)
- [Главная с фильмом в первом экране](home-v4-film/)
- [Главная с роликами по слайдам](home-v4-video/)
- [Топ-10 сайтов для ЯрМеда](top10/)
