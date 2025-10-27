## Установка

1. Установите зависимости:
```bash
npm install
```

2. Убедитесь, что у вас установлен Node.js версии 16 или выше.

## Использование

### Основные команды

```bash
# Шифрование изображения потоковым алгоритмом
node src/main.ts --mode encrypt --in image.png --algo stream --key "mySecretKey"

# Шифрование изображения перестановочным алгоритмом
node src/main.ts --mode encrypt --in image.png --algo perm-mix --key "mySecretKey" --iterations 15

# Дешифрование
node src/main.ts --mode decrypt --in image_stream_encrypted.png --key "mySecretKey"

# Анализ метрик изображения
node src/main.ts --mode analyze --in image.png
```

### Параметры командной строки

- `--mode <mode>` - Режим работы: `encrypt`, `decrypt`, `analyze`
- `--in <file>` - Входной файл изображения
- `--algo <algorithm>` - Алгоритм: `stream`, `perm-mix`
- `--key <key>` - Секретный ключ
- `--meta <file>` - Файл метаданных (опционально)
- `--iterations <num>` - Количество итераций для перестановки (по умолчанию: 10)

### Получение результатов тестирования

Для получения полных результатов тестирования (папка results с отчетами) используйте консольные команды:

#### Пример: тестирование изображения bird.png

```bash
# Зашифровать
node src/main.ts --mode encrypt --in imgs/bird.png --algo perm-mix --key "mySecretKey" --iterations 15

# Дешифровать
node src/main.ts --mode decrypt --in bird_perm-mix_encrypted.png --key "mySecretKey" --meta bird_perm-mix_encrypted.meta.json

# Анализ метрик
node src/main.ts --mode analyze --in imgs/bird.png
```

## Гистограммы

Гистограммы показывают распределение интенсивности пикселей в изображении по каналу RGB. Вот что они означают:

### Гистограмма исходного изображения (histogram_original.png)

- Ось X (горизонтальная): значения интенсивности от 0 до 255
- Ось Y (вертикальная): количество пикселей с данной интенсивностью
- Красные столбцы: показывают, сколько пикселей имеет каждое значение интенсивности

Примеры для разных изображений:
- gradient.png: плавное распределение по всем значениям (градиент)
- checkerboard.png: два пика на значениях 0 и 255 (черные и белые квадраты)
- bird.png: неравномерное распределение с пиками в определенных диапазонах
- noise_texture.png: более равномерное распределение (шумовая текстура)
