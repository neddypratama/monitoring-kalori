<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/OpenFoodFactsService.php';

echo "Running OpenFoodFactsTest...\n";

Assert::test('rejects empty or 1-character search query', function (): void {
    Assert::throws(InvalidArgumentException::class, fn() => OpenFoodFactsService::searchProducts(''));
    Assert::throws(InvalidArgumentException::class, fn() => OpenFoodFactsService::searchProducts('a'));
});

Assert::test('normalizes Open Food Facts products with kcal, macros, serving_grams, and brand', function (): void {
    $raw = [
        [
            'code' => '089686010343',
            'product_name' => 'Mi Goreng',
            'brands' => 'Indomie',
            'serving_size' => '1 bungkus (85 g)',
            'serving_quantity' => '85',
            'image_front_small_url' => 'https://example.com/indomie.jpg',
            'nutriments' => [
                'energy-kcal_100g' => 450,
                'proteins_100g' => 9.4,
                'carbohydrates_100g' => 61.2,
                'fat_100g' => 18.8,
            ],
        ],
        [
            // Missing energy-kcal_100g -> falls back to energy_100g (kJ / 4.184)
            'code' => '111222',
            'product_name' => 'Susu UHT Full Cream',
            'brands' => 'Ultra Milk',
            'serving_size' => '250 ml',
            'nutriments' => [
                'energy_100g' => 251, // ~60 kcal
                'proteins_100g' => 3.2,
                'carbohydrates_100g' => 4.8,
                'fat_100g' => 3.3,
            ],
        ],
        [
            // Missing calories -> must be filtered out
            'code' => '999',
            'product_name' => 'Produk Tanpa Gizi',
            'nutriments' => [],
        ],
    ];

    $items = OpenFoodFactsService::normalizeProducts($raw);
    Assert::equals(2, count($items));

    Assert::equals('Mi Goreng (Indomie)', $items[0]['name']);
    Assert::approx(85.0, (float) $items[0]['serving_grams'], 0.01);
    Assert::equals('bungkus', $items[0]['default_unit']);
    Assert::approx(450.0, (float) $items[0]['calories_per_100g'], 0.1);
    Assert::equals(383, (int) $items[0]['calories_per_serving']);
    Assert::approx(9.4, (float) $items[0]['protein_per_100g'], 0.1);

    Assert::equals('Susu UHT Full Cream (Ultra Milk)', $items[1]['name']);
    Assert::approx(250.0, (float) $items[1]['serving_grams'], 0.01);
    Assert::equals('gelas', $items[1]['default_unit']);
    Assert::approx(60.0, (float) $items[1]['calories_per_100g'], 0.5);
    Assert::equals(150, (int) $items[1]['calories_per_serving']);
});

Assert::test('searchProducts uses injected fetcher and surfaces friendly error on failure', function (): void {
    $mockOk = static function (string $url): array {
        Assert::true(str_contains($url, 'q=indomie'), 'URL missing q=indomie');
        return [
            'ok' => true,
            'status' => 200,
            'body' => json_encode([
                'hits' => [[
                    'code' => '123',
                    'product_name' => 'Indomie Goreng',
                    'brands' => ['Indomie'],
                    'quantity' => '85 g',
                    'nutriments' => ['energy-kcal_100g' => 450, 'proteins_100g' => 9, 'carbohydrates_100g' => 60, 'fat_100g' => 19],
                ]],
            ]),
            'error' => '',
        ];
    };

    $res = OpenFoodFactsService::searchProducts('indomie', $mockOk);
    Assert::equals(1, count($res));
    Assert::equals('Indomie Goreng', $res[0]['name']); // Brand already in name -> not duplicated
    Assert::approx(85.0, (float) $res[0]['serving_grams'], 0.01);

    $mockFail = static fn(string $url): array => ['ok' => false, 'status' => 0, 'body' => '', 'error' => 'Timed out'];
    Assert::throws(RuntimeException::class, fn() => OpenFoodFactsService::searchProducts('indomie', $mockFail));
});

exit(Assert::summary('OpenFoodFactsTest'));
