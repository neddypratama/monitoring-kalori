<<<<<<< HEAD
<?php
declare(strict_types=1);

final class SeedData
{
    /**
     * Format: [name, category, default_unit, serving_grams, cal_100g, pro_100g, carb_100g, fat_100g]
     * Values aligned with TKPI (Tabel Komposisi Pangan Indonesia) & USDA references.
     *
     * @return array<int, array{0:string,1:string,2:string,3:float,4:float,5:float,6:float,7:float}>
     */
    public static function foods(): array
    {
        return [
            // === MAKANAN POKOK (18) ===
            ['Nasi Putih', 'Makanan Pokok', 'piring', 150, 130, 2.7, 28.0, 0.3],
            ['Nasi Merah', 'Makanan Pokok', 'piring', 150, 111, 2.6, 23.0, 0.9],
            ['Nasi Uduk', 'Makanan Pokok', 'piring', 180, 175, 3.2, 27.5, 5.8],
            ['Nasi Kuning', 'Makanan Pokok', 'piring', 180, 165, 3.1, 26.8, 5.0],
            ['Nasi Liwet', 'Makanan Pokok', 'piring', 180, 158, 3.0, 26.0, 4.5],
            ['Lontong', 'Makanan Pokok', 'buah', 150, 115, 2.2, 25.0, 0.3],
            ['Ketupat', 'Makanan Pokok', 'buah', 160, 120, 2.4, 26.0, 0.4],
            ['Bubur Ayam Polos (Bubur Saja)', 'Makanan Pokok', 'mangkok', 250, 62, 1.5, 13.0, 0.3],
            ['Roti Tawar Putih', 'Makanan Pokok', 'lembar', 35, 265, 8.9, 49.0, 3.2],
            ['Roti Gandum', 'Makanan Pokok', 'lembar', 38, 247, 13.0, 41.0, 3.4],
            ['Oatmeal Masak', 'Makanan Pokok', 'mangkok', 230, 71, 2.5, 12.0, 1.5],
            ['Oatmeal Kering (Rolled Oats)', 'Makanan Pokok', 'sdm', 10, 389, 16.9, 66.3, 6.9],
            ['Kentang Rebus', 'Makanan Pokok', 'buah', 150, 87, 1.9, 20.1, 0.1],
            ['Kentang Tumbuk (Mashed Potato)', 'Makanan Pokok', 'porsi', 150, 113, 2.0, 16.0, 4.5],
            ['Ubi Jalar Rebus', 'Makanan Pokok', 'buah', 150, 86, 1.6, 20.1, 0.1],
            ['Singkong Rebus', 'Makanan Pokok', 'potong', 120, 160, 1.4, 38.0, 0.3],
            ['Jagung Rebus', 'Makanan Pokok', 'tongkol', 150, 96, 3.4, 21.0, 1.5],
            ['Mie Telur Rebus Polos', 'Makanan Pokok', 'mangkok', 160, 138, 4.5, 25.0, 2.1],

            // === LAUK (28) ===
            ['Ayam Goreng', 'Lauk', 'potong', 100, 260, 25.0, 4.5, 15.5],
            ['Ayam Bakar', 'Lauk', 'potong', 100, 195, 27.0, 3.0, 8.0],
            ['Dada Ayam Rebus / Panggang', 'Lauk', 'potong', 100, 165, 31.0, 0.0, 3.6],
            ['Ayam Geprek', 'Lauk', 'potong', 120, 285, 22.0, 12.0, 16.5],
            ['Ayam Opor', 'Lauk', 'potong', 120, 215, 18.0, 4.0, 14.0],
            ['Ayam Kecap', 'Lauk', 'potong', 110, 198, 21.0, 7.5, 9.2],
            ['Telur Rebus', 'Lauk', 'butir', 50, 155, 12.6, 1.1, 10.6],
            ['Telur Dadar', 'Lauk', 'butir', 65, 192, 11.0, 1.5, 15.8],
            ['Telur Ceplok (Mata Sapi)', 'Lauk', 'butir', 55, 196, 13.6, 0.8, 15.0],
            ['Telur Balado', 'Lauk', 'butir', 70, 180, 10.5, 4.5, 13.0],
            ['Telur Asin', 'Lauk', 'butir', 60, 185, 13.0, 1.5, 14.0],
            ['Putih Telur Rebus', 'Lauk', 'butir', 33, 52, 10.9, 0.7, 0.2],
            ['Tempe Goreng', 'Lauk', 'potong', 50, 225, 17.0, 11.0, 13.0],
            ['Tempe Bacem', 'Lauk', 'potong', 50, 200, 15.0, 17.0, 8.0],
            ['Tempe Orek', 'Lauk', 'porsi', 75, 215, 14.0, 18.0, 10.0],
            ['Tempe Kukus / Rebus', 'Lauk', 'potong', 50, 192, 19.0, 9.4, 10.8],
            ['Tahu Goreng', 'Lauk', 'potong', 50, 165, 11.0, 3.5, 12.0],
            ['Tahu Kukus / Putih', 'Lauk', 'potong', 50, 76, 8.1, 1.9, 4.8],
            ['Tahu Bacem', 'Lauk', 'potong', 55, 135, 9.5, 8.0, 7.2],
            ['Rendang Daging Sapi', 'Lauk', 'potong', 75, 265, 22.0, 5.5, 17.5],
            ['Empal Daging Sapi', 'Lauk', 'potong', 70, 240, 25.0, 6.0, 13.0],
            ['Daging Sapi Panggang (Sirloin)', 'Lauk', 'porsi', 100, 212, 27.0, 0.0, 11.0],
            ['Ikan Lele Goreng', 'Lauk', 'ekor', 100, 210, 18.0, 3.0, 14.0],
            ['Ikan Kembung Goreng', 'Lauk', 'ekor', 100, 205, 21.0, 1.5, 12.5],
            ['Ikan Kembung Bakar / Kukus', 'Lauk', 'ekor', 100, 155, 22.0, 0.5, 7.0],
            ['Ikan Salmon Panggang', 'Lauk', 'potong', 100, 208, 20.4, 0.0, 13.4],
            ['Ikan Tuna Kaleng (Air)', 'Lauk', 'porsi', 100, 116, 25.5, 0.0, 0.8],
            ['Udang Goreng / Tumis', 'Lauk', 'porsi', 80, 145, 21.0, 2.0, 5.8],

            // === SAYUR (16) ===
            ['Sayur Asem', 'Sayur', 'mangkok', 200, 32, 1.2, 5.5, 0.6],
            ['Sayur Sop Ayam/Sayuran', 'Sayur', 'mangkok', 200, 42, 2.5, 5.0, 1.2],
            ['Sayur Bayam Bening', 'Sayur', 'mangkok', 180, 22, 1.8, 3.5, 0.3],
            ['Sayur Lodeh', 'Sayur', 'mangkok', 200, 82, 2.3, 6.5, 5.4],
            ['Tumis Kangkung', 'Sayur', 'porsi', 100, 78, 2.5, 4.5, 5.6],
            ['Capcay Kuah / Goreng', 'Sayur', 'porsi', 150, 68, 3.2, 6.8, 3.1],
            ['Tumis Tauge Tahu', 'Sayur', 'porsi', 100, 85, 5.2, 5.0, 4.8],
            ['Tumis Buncis', 'Sayur', 'porsi', 100, 65, 2.0, 6.5, 3.5],
            ['Brokoli Rebus / Kukus', 'Sayur', 'mangkok', 100, 35, 2.4, 7.2, 0.4],
            ['Wortel Rebus', 'Sayur', 'porsi', 100, 35, 0.8, 8.2, 0.2],
            ['Salad Sayur Tanpa Dressing', 'Sayur', 'mangkok', 120, 20, 1.3, 3.8, 0.2],
            ['Lalapan Segar (Timun, Kemangi, Kol)', 'Sayur', 'porsi', 80, 18, 0.9, 3.6, 0.2],
            ['Urap Sayur', 'Sayur', 'porsi', 120, 95, 2.8, 7.5, 6.2],
            ['Gudeg Nangka', 'Sayur', 'porsi', 120, 145, 2.5, 22.0, 5.5],
            ['Terong Balado', 'Sayur', 'porsi', 100, 118, 1.5, 9.5, 8.2],
            ['Perkedel Kentang', 'Sayur', 'buah', 45, 195, 4.2, 21.0, 10.5],

            // === MASAKAN JADI (26) ===
            ['Nasi Goreng', 'Masakan Jadi', 'piring', 250, 172, 5.5, 22.5, 6.8],
            ['Nasi Goreng Spesial (Telur + Ayam)', 'Masakan Jadi', 'piring', 300, 185, 7.5, 21.5, 7.6],
            ['Mie Goreng Instan (1 Bungkus)', 'Masakan Jadi', 'bungkus', 85, 447, 9.4, 61.0, 18.8],
            ['Mie Kuah Instan (1 Bungkus)', 'Masakan Jadi', 'bungkus', 75, 440, 9.3, 60.0, 18.0],
            ['Mie Ayam', 'Masakan Jadi', 'mangkok', 300, 142, 6.2, 18.5, 4.8],
            ['Bakso Sapi', 'Masakan Jadi', 'mangkok', 300, 112, 6.8, 11.5, 4.2],
            ['Soto Ayam', 'Masakan Jadi', 'mangkok', 300, 95, 6.5, 8.2, 4.0],
            ['Soto Betawi', 'Masakan Jadi', 'mangkok', 300, 145, 7.8, 7.5, 9.5],
            ['Rawon Daging', 'Masakan Jadi', 'mangkok', 300, 118, 8.5, 6.0, 6.6],
            ['Gado-Gado (Dengan Bumbu Kacang)', 'Masakan Jadi', 'porsi', 250, 132, 5.8, 12.5, 6.8],
            ['Ketoprak', 'Masakan Jadi', 'porsi', 280, 148, 5.4, 17.5, 6.4],
            ['Pecel Sayur + Bumbu Kacang', 'Masakan Jadi', 'porsi', 200, 120, 4.8, 11.0, 6.5],
            ['Sate Ayam (10 Tusuk + Bumbu Kacang)', 'Masakan Jadi', 'porsi', 200, 215, 19.0, 9.5, 11.5],
            ['Sate Kambing (10 Tusuk)', 'Masakan Jadi', 'porsi', 200, 228, 22.0, 5.0, 13.2],
            ['Bubur Ayam Lengkap', 'Masakan Jadi', 'mangkok', 320, 116, 5.2, 14.5, 4.0],
            ['Nasi Padang (Nasi + Rendang + Sayur)', 'Masakan Jadi', 'porsi', 380, 178, 8.0, 20.0, 7.4],
            ['Nasi Pecel Lele (Nasi + Lele + Sambal)', 'Masakan Jadi', 'porsi', 320, 168, 7.8, 19.0, 6.8],
            ['Nasi Ayam Geprek Komplit', 'Masakan Jadi', 'porsi', 330, 192, 9.5, 20.5, 8.0],
            ['Kwetiau Goreng', 'Masakan Jadi', 'piring', 260, 178, 5.8, 23.0, 7.0],
            ['Bihun Goreng', 'Masakan Jadi', 'piring', 240, 165, 5.0, 23.5, 5.6],
            ['Pempek Kapal Selam + Cuko', 'Masakan Jadi', 'porsi', 200, 158, 7.2, 22.0, 4.5],
            ['Siomay Bandung (5 Buah + Bumbu)', 'Masakan Jadi', 'porsi', 220, 155, 6.5, 16.0, 7.2],
            ['Batagor (1 Porsi + Bumbu Kacang)', 'Masakan Jadi', 'porsi', 200, 218, 7.5, 22.0, 11.2],
            ['Martabak Telur', 'Masakan Jadi', 'potong', 75, 245, 9.5, 21.0, 13.8],
            ['Pizza Keju / Pepperoni', 'Masakan Jadi', 'slice', 105, 266, 11.0, 33.0, 10.0],
            ['Burger Daging Sapi', 'Masakan Jadi', 'buah', 160, 254, 13.0, 26.0, 11.0],

            // === BUAH (14) ===
            ['Pisang Cavendish / Ambon', 'Buah', 'buah', 110, 89, 1.1, 22.8, 0.3],
            ['Apel', 'Buah', 'buah', 150, 52, 0.3, 13.8, 0.2],
            ['Jeruk Manis', 'Buah', 'buah', 130, 47, 0.9, 11.8, 0.1],
            ['Pepaya', 'Buah', 'potong', 150, 43, 0.5, 10.8, 0.3],
            ['Semangka', 'Buah', 'potong', 180, 30, 0.6, 7.6, 0.2],
            ['Melon', 'Buah', 'potong', 150, 34, 0.8, 8.2, 0.2],
            ['Mangga Harum Manis', 'Buah', 'buah', 200, 60, 0.8, 15.0, 0.4],
            ['Alpukat', 'Buah', 'buah', 150, 160, 2.0, 8.5, 14.7],
            ['Buah Naga Merah', 'Buah', 'buah', 180, 50, 1.1, 11.0, 0.4],
            ['Pir', 'Buah', 'buah', 160, 57, 0.4, 15.2, 0.1],
            ['Anggur', 'Buah', 'porsi', 100, 69, 0.7, 18.1, 0.2],
            ['Stroberi', 'Buah', 'porsi', 100, 32, 0.7, 7.7, 0.3],
            ['Salak', 'Buah', 'buah', 45, 82, 0.8, 20.9, 0.4],
            ['Kurma', 'Buah', 'butir', 10, 282, 2.5, 75.0, 0.4],

            // === MINUMAN (15) ===
            ['Air Putih', 'Minuman', 'gelas', 250, 0, 0.0, 0.0, 0.0],
            ['Teh Tawar Panas / Es', 'Minuman', 'gelas', 250, 1, 0.0, 0.2, 0.0],
            ['Es Teh Manis', 'Minuman', 'gelas', 250, 36, 0.0, 9.0, 0.0],
            ['Kopi Hitam Tanpa Gula (Americano)', 'Minuman', 'gelas', 240, 2, 0.1, 0.0, 0.0],
            ['Kopi Susu Gula Aren', 'Minuman', 'gelas', 250, 76, 1.8, 12.0, 2.4],
            ['Caffe Latte (Tanpa Gula)', 'Minuman', 'gelas', 250, 48, 2.6, 4.2, 2.3],
            ['Susu Full Cream', 'Minuman', 'gelas', 250, 61, 3.2, 4.8, 3.3],
            ['Susu Low Fat / Skim', 'Minuman', 'gelas', 250, 42, 3.4, 5.0, 1.0],
            ['Susu Kedelai Tanpa Gula', 'Minuman', 'gelas', 250, 33, 2.9, 1.8, 1.6],
            ['Jus Alpukat (Sedikit Gula/Susu)', 'Minuman', 'gelas', 250, 112, 1.8, 12.5, 6.2],
            ['Jus Jeruk Murni', 'Minuman', 'gelas', 250, 45, 0.7, 10.4, 0.2],
            ['Es Jeruk Peras Manis', 'Minuman', 'gelas', 250, 48, 0.4, 11.8, 0.1],
            ['Minuman Boba / Milk Tea Manis', 'Minuman', 'gelas', 350, 96, 1.2, 18.5, 2.2],
            ['Minuman Soda Manis (Cola)', 'Minuman', 'kaleng', 330, 42, 0.0, 10.6, 0.0],
            ['Air Kelapa Muda Murni', 'Minuman', 'gelas', 250, 19, 0.7, 3.7, 0.2],

            // === CAMILAN (15) ===
            ['Pisang Goreng', 'Camilan', 'buah', 65, 235, 2.2, 32.0, 11.0],
            ['Tahu Isi Goreng', 'Camilan', 'buah', 65, 205, 6.8, 16.0, 12.8],
            ['Bakwan Sayur (Bala-Bala)', 'Camilan', 'buah', 55, 245, 4.2, 27.0, 13.5],
            ['Tempe Mendoan', 'Camilan', 'potong', 60, 230, 11.5, 16.5, 13.0],
            ['Risoles Ragout / Mayo', 'Camilan', 'buah', 65, 235, 6.2, 24.0, 12.5],
            ['Lemper Ayam', 'Camilan', 'buah', 70, 190, 5.2, 31.0, 5.0],
            ['Martabak Manis Cokelat Kacang', 'Camilan', 'potong', 85, 315, 6.5, 44.0, 12.8],
            ['Donat Gula / Glaze', 'Camilan', 'buah', 60, 405, 5.2, 50.0, 20.5],
            ['Kerupuk Putih / Udang', 'Camilan', 'buah', 15, 480, 4.0, 68.0, 21.0],
            ['Kacang Tanah Panggang', 'Camilan', 'genggam', 30, 585, 23.7, 21.5, 49.7],
            ['Almond Panggang', 'Camilan', 'genggam', 28, 598, 21.0, 21.0, 52.5],
            ['Yogurt Plain Low Fat', 'Camilan', 'cup', 120, 63, 5.3, 7.0, 1.6],
            ['Biskuit Gandum / Oat', 'Camilan', 'keping', 15, 450, 7.5, 66.0, 17.0],
            ['Keripik Kentang', 'Camilan', 'bungkus', 35, 536, 7.0, 53.0, 34.6],
            ['Cokelat Hitam (Dark Chocolate 70%)', 'Camilan', 'potong', 20, 598, 7.8, 46.0, 43.0],
        ];
    }

    /**
     * Format: [name, category, met, supports_distance, default_speed_kmh]
     * Values aligned with Compendium of Physical Activities.
     *
     * @return array<int, array{0:string,1:string,2:float,3:int,4:?float}>
     */
    public static function activities(): array
    {
        return [
            // === JALAN & LARI (7) ===
            ['Jalan Santai', 'Jalan & Lari', 3.3, 1, 4.5],
            ['Jalan Cepat (Brisk Walk)', 'Jalan & Lari', 4.3, 1, 6.0],
            ['Jalan Menanjak / Hiking Ringan', 'Jalan & Lari', 6.0, 1, 4.0],
            ['Jogging / Lari Santai', 'Jalan & Lari', 8.3, 1, 8.0],
            ['Lari Sedang', 'Jalan & Lari', 9.8, 1, 10.0],
            ['Lari Cepat', 'Jalan & Lari', 11.8, 1, 12.0],
            ['Treadmill Jalan / Lari Ringan', 'Jalan & Lari', 6.5, 1, 6.5],

            // === KARDIO (7) ===
            ['Bersepeda Santai', 'Kardio', 6.8, 1, 16.0],
            ['Bersepeda Sedang / Cepat', 'Kardio', 8.5, 1, 20.0],
            ['Sepeda Statis (Sedang)', 'Kardio', 7.0, 0, null],
            ['Berenang Santai', 'Kardio', 6.0, 1, 2.0],
            ['Berenang Gaya Bebas (Sedang)', 'Kardio', 8.3, 1, 2.8],
            ['Lompat Tali (Skipping)', 'Kardio', 11.0, 0, null],
            ['Senam Aerobik / Zumba', 'Kardio', 6.5, 0, null],

            // === KEKUATAN (5) ===
            ['Angkat Beban / Gym (Sedang)', 'Kekuatan', 5.0, 0, null],
            ['Kalistenik (Push-up, Squat, Plank)', 'Kekuatan', 4.5, 0, null],
            ['HIIT / Latihan Sirkuit', 'Kekuatan', 8.0, 0, null],
            ['Yoga', 'Kekuatan', 3.0, 0, null],
            ['Pilates / Peregangan Aktif', 'Kekuatan', 3.5, 0, null],

            // === OLAHRAGA PERMAINAN (5) ===
            ['Badminton (Rekreasi / Sedang)', 'Olahraga Permainan', 5.5, 0, null],
            ['Futsal / Sepak Bola', 'Olahraga Permainan', 8.0, 0, null],
            ['Basket', 'Olahraga Permainan', 6.5, 0, null],
            ['Tenis Lapangan / Padel', 'Olahraga Permainan', 7.3, 0, null],
            ['Tenis Meja (Pingpong)', 'Olahraga Permainan', 4.0, 0, null],

            // === AKTIVITAS HARIAN (5) ===
            ['Naik Tangga', 'Aktivitas Harian', 8.0, 0, null],
            ['Menyapu / Mengepel Rumah', 'Aktivitas Harian', 3.3, 0, null],
            ['Mencuci Motor / Mobil', 'Aktivitas Harian', 3.5, 0, null],
            ['Berkebun Ringan', 'Aktivitas Harian', 3.8, 0, null],
            ['Belanja Jalan Kaki (Pasar / Mall)', 'Aktivitas Harian', 2.8, 1, 3.5],
        ];
    }

    public static function seedIfEmpty(PDO $pdo): void
    {
        $foodCount = (int) $pdo->query('SELECT COUNT(*) FROM foods')->fetchColumn();
        if ($foodCount === 0) {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO foods (name, category, default_unit, serving_grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_custom, is_favorite)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)'
                );
                foreach (self::foods() as $row) {
                    $stmt->execute($row);
                }
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
        }

        $actCount = (int) $pdo->query('SELECT COUNT(*) FROM activities')->fetchColumn();
        if ($actCount === 0) {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO activities (name, category, met, supports_distance, default_speed_kmh, is_custom, is_favorite)
                     VALUES (?, ?, ?, ?, ?, 0, 0)'
                );
                foreach (self::activities() as $row) {
                    $stmt->execute($row);
                }
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
        }
    }
}
=======
<?php
declare(strict_types=1);

final class SeedData
{
    /**
     * Format: [name, category, default_unit, serving_grams, cal_100g, pro_100g, carb_100g, fat_100g]
     * Values aligned with TKPI (Tabel Komposisi Pangan Indonesia) & USDA references.
     *
     * @return array<int, array{0:string,1:string,2:string,3:float,4:float,5:float,6:float,7:float}>
     */
    public static function foods(): array
    {
        return [
            // === MAKANAN POKOK (18) ===
            ['Nasi Putih', 'Makanan Pokok', 'piring', 150, 130, 2.7, 28.0, 0.3],
            ['Nasi Merah', 'Makanan Pokok', 'piring', 150, 111, 2.6, 23.0, 0.9],
            ['Nasi Uduk', 'Makanan Pokok', 'piring', 180, 175, 3.2, 27.5, 5.8],
            ['Nasi Kuning', 'Makanan Pokok', 'piring', 180, 165, 3.1, 26.8, 5.0],
            ['Nasi Liwet', 'Makanan Pokok', 'piring', 180, 158, 3.0, 26.0, 4.5],
            ['Lontong', 'Makanan Pokok', 'buah', 150, 115, 2.2, 25.0, 0.3],
            ['Ketupat', 'Makanan Pokok', 'buah', 160, 120, 2.4, 26.0, 0.4],
            ['Bubur Ayam Polos (Bubur Saja)', 'Makanan Pokok', 'mangkok', 250, 62, 1.5, 13.0, 0.3],
            ['Roti Tawar Putih', 'Makanan Pokok', 'lembar', 35, 265, 8.9, 49.0, 3.2],
            ['Roti Gandum', 'Makanan Pokok', 'lembar', 38, 247, 13.0, 41.0, 3.4],
            ['Oatmeal Masak', 'Makanan Pokok', 'mangkok', 230, 71, 2.5, 12.0, 1.5],
            ['Oatmeal Kering (Rolled Oats)', 'Makanan Pokok', 'sdm', 10, 389, 16.9, 66.3, 6.9],
            ['Kentang Rebus', 'Makanan Pokok', 'buah', 150, 87, 1.9, 20.1, 0.1],
            ['Kentang Tumbuk (Mashed Potato)', 'Makanan Pokok', 'porsi', 150, 113, 2.0, 16.0, 4.5],
            ['Ubi Jalar Rebus', 'Makanan Pokok', 'buah', 150, 86, 1.6, 20.1, 0.1],
            ['Singkong Rebus', 'Makanan Pokok', 'potong', 120, 160, 1.4, 38.0, 0.3],
            ['Jagung Rebus', 'Makanan Pokok', 'tongkol', 150, 96, 3.4, 21.0, 1.5],
            ['Mie Telur Rebus Polos', 'Makanan Pokok', 'mangkok', 160, 138, 4.5, 25.0, 2.1],

            // === LAUK (28) ===
            ['Ayam Goreng', 'Lauk', 'potong', 100, 260, 25.0, 4.5, 15.5],
            ['Ayam Bakar', 'Lauk', 'potong', 100, 195, 27.0, 3.0, 8.0],
            ['Dada Ayam Rebus / Panggang', 'Lauk', 'potong', 100, 165, 31.0, 0.0, 3.6],
            ['Ayam Geprek', 'Lauk', 'potong', 120, 285, 22.0, 12.0, 16.5],
            ['Ayam Opor', 'Lauk', 'potong', 120, 215, 18.0, 4.0, 14.0],
            ['Ayam Kecap', 'Lauk', 'potong', 110, 198, 21.0, 7.5, 9.2],
            ['Telur Rebus', 'Lauk', 'butir', 50, 155, 12.6, 1.1, 10.6],
            ['Telur Dadar', 'Lauk', 'butir', 65, 192, 11.0, 1.5, 15.8],
            ['Telur Ceplok (Mata Sapi)', 'Lauk', 'butir', 55, 196, 13.6, 0.8, 15.0],
            ['Telur Balado', 'Lauk', 'butir', 70, 180, 10.5, 4.5, 13.0],
            ['Telur Asin', 'Lauk', 'butir', 60, 185, 13.0, 1.5, 14.0],
            ['Putih Telur Rebus', 'Lauk', 'butir', 33, 52, 10.9, 0.7, 0.2],
            ['Tempe Goreng', 'Lauk', 'potong', 50, 225, 17.0, 11.0, 13.0],
            ['Tempe Bacem', 'Lauk', 'potong', 50, 200, 15.0, 17.0, 8.0],
            ['Tempe Orek', 'Lauk', 'porsi', 75, 215, 14.0, 18.0, 10.0],
            ['Tempe Kukus / Rebus', 'Lauk', 'potong', 50, 192, 19.0, 9.4, 10.8],
            ['Tahu Goreng', 'Lauk', 'potong', 50, 165, 11.0, 3.5, 12.0],
            ['Tahu Kukus / Putih', 'Lauk', 'potong', 50, 76, 8.1, 1.9, 4.8],
            ['Tahu Bacem', 'Lauk', 'potong', 55, 135, 9.5, 8.0, 7.2],
            ['Rendang Daging Sapi', 'Lauk', 'potong', 75, 265, 22.0, 5.5, 17.5],
            ['Empal Daging Sapi', 'Lauk', 'potong', 70, 240, 25.0, 6.0, 13.0],
            ['Daging Sapi Panggang (Sirloin)', 'Lauk', 'porsi', 100, 212, 27.0, 0.0, 11.0],
            ['Ikan Lele Goreng', 'Lauk', 'ekor', 100, 210, 18.0, 3.0, 14.0],
            ['Ikan Kembung Goreng', 'Lauk', 'ekor', 100, 205, 21.0, 1.5, 12.5],
            ['Ikan Kembung Bakar / Kukus', 'Lauk', 'ekor', 100, 155, 22.0, 0.5, 7.0],
            ['Ikan Salmon Panggang', 'Lauk', 'potong', 100, 208, 20.4, 0.0, 13.4],
            ['Ikan Tuna Kaleng (Air)', 'Lauk', 'porsi', 100, 116, 25.5, 0.0, 0.8],
            ['Udang Goreng / Tumis', 'Lauk', 'porsi', 80, 145, 21.0, 2.0, 5.8],

            // === SAYUR (16) ===
            ['Sayur Asem', 'Sayur', 'mangkok', 200, 32, 1.2, 5.5, 0.6],
            ['Sayur Sop Ayam/Sayuran', 'Sayur', 'mangkok', 200, 42, 2.5, 5.0, 1.2],
            ['Sayur Bayam Bening', 'Sayur', 'mangkok', 180, 22, 1.8, 3.5, 0.3],
            ['Sayur Lodeh', 'Sayur', 'mangkok', 200, 82, 2.3, 6.5, 5.4],
            ['Tumis Kangkung', 'Sayur', 'porsi', 100, 78, 2.5, 4.5, 5.6],
            ['Capcay Kuah / Goreng', 'Sayur', 'porsi', 150, 68, 3.2, 6.8, 3.1],
            ['Tumis Tauge Tahu', 'Sayur', 'porsi', 100, 85, 5.2, 5.0, 4.8],
            ['Tumis Buncis', 'Sayur', 'porsi', 100, 65, 2.0, 6.5, 3.5],
            ['Brokoli Rebus / Kukus', 'Sayur', 'mangkok', 100, 35, 2.4, 7.2, 0.4],
            ['Wortel Rebus', 'Sayur', 'porsi', 100, 35, 0.8, 8.2, 0.2],
            ['Salad Sayur Tanpa Dressing', 'Sayur', 'mangkok', 120, 20, 1.3, 3.8, 0.2],
            ['Lalapan Segar (Timun, Kemangi, Kol)', 'Sayur', 'porsi', 80, 18, 0.9, 3.6, 0.2],
            ['Urap Sayur', 'Sayur', 'porsi', 120, 95, 2.8, 7.5, 6.2],
            ['Gudeg Nangka', 'Sayur', 'porsi', 120, 145, 2.5, 22.0, 5.5],
            ['Terong Balado', 'Sayur', 'porsi', 100, 118, 1.5, 9.5, 8.2],
            ['Perkedel Kentang', 'Sayur', 'buah', 45, 195, 4.2, 21.0, 10.5],

            // === MASAKAN JADI (26) ===
            ['Nasi Goreng', 'Masakan Jadi', 'piring', 250, 172, 5.5, 22.5, 6.8],
            ['Nasi Goreng Spesial (Telur + Ayam)', 'Masakan Jadi', 'piring', 300, 185, 7.5, 21.5, 7.6],
            ['Mie Goreng Instan (1 Bungkus)', 'Masakan Jadi', 'bungkus', 85, 447, 9.4, 61.0, 18.8],
            ['Mie Kuah Instan (1 Bungkus)', 'Masakan Jadi', 'bungkus', 75, 440, 9.3, 60.0, 18.0],
            ['Mie Ayam', 'Masakan Jadi', 'mangkok', 300, 142, 6.2, 18.5, 4.8],
            ['Bakso Sapi', 'Masakan Jadi', 'mangkok', 300, 112, 6.8, 11.5, 4.2],
            ['Soto Ayam', 'Masakan Jadi', 'mangkok', 300, 95, 6.5, 8.2, 4.0],
            ['Soto Betawi', 'Masakan Jadi', 'mangkok', 300, 145, 7.8, 7.5, 9.5],
            ['Rawon Daging', 'Masakan Jadi', 'mangkok', 300, 118, 8.5, 6.0, 6.6],
            ['Gado-Gado (Dengan Bumbu Kacang)', 'Masakan Jadi', 'porsi', 250, 132, 5.8, 12.5, 6.8],
            ['Ketoprak', 'Masakan Jadi', 'porsi', 280, 148, 5.4, 17.5, 6.4],
            ['Pecel Sayur + Bumbu Kacang', 'Masakan Jadi', 'porsi', 200, 120, 4.8, 11.0, 6.5],
            ['Sate Ayam (10 Tusuk + Bumbu Kacang)', 'Masakan Jadi', 'porsi', 200, 215, 19.0, 9.5, 11.5],
            ['Sate Kambing (10 Tusuk)', 'Masakan Jadi', 'porsi', 200, 228, 22.0, 5.0, 13.2],
            ['Bubur Ayam Lengkap', 'Masakan Jadi', 'mangkok', 320, 116, 5.2, 14.5, 4.0],
            ['Nasi Padang (Nasi + Rendang + Sayur)', 'Masakan Jadi', 'porsi', 380, 178, 8.0, 20.0, 7.4],
            ['Nasi Pecel Lele (Nasi + Lele + Sambal)', 'Masakan Jadi', 'porsi', 320, 168, 7.8, 19.0, 6.8],
            ['Nasi Ayam Geprek Komplit', 'Masakan Jadi', 'porsi', 330, 192, 9.5, 20.5, 8.0],
            ['Kwetiau Goreng', 'Masakan Jadi', 'piring', 260, 178, 5.8, 23.0, 7.0],
            ['Bihun Goreng', 'Masakan Jadi', 'piring', 240, 165, 5.0, 23.5, 5.6],
            ['Pempek Kapal Selam + Cuko', 'Masakan Jadi', 'porsi', 200, 158, 7.2, 22.0, 4.5],
            ['Siomay Bandung (5 Buah + Bumbu)', 'Masakan Jadi', 'porsi', 220, 155, 6.5, 16.0, 7.2],
            ['Batagor (1 Porsi + Bumbu Kacang)', 'Masakan Jadi', 'porsi', 200, 218, 7.5, 22.0, 11.2],
            ['Martabak Telur', 'Masakan Jadi', 'potong', 75, 245, 9.5, 21.0, 13.8],
            ['Pizza Keju / Pepperoni', 'Masakan Jadi', 'slice', 105, 266, 11.0, 33.0, 10.0],
            ['Burger Daging Sapi', 'Masakan Jadi', 'buah', 160, 254, 13.0, 26.0, 11.0],

            // === BUAH (14) ===
            ['Pisang Cavendish / Ambon', 'Buah', 'buah', 110, 89, 1.1, 22.8, 0.3],
            ['Apel', 'Buah', 'buah', 150, 52, 0.3, 13.8, 0.2],
            ['Jeruk Manis', 'Buah', 'buah', 130, 47, 0.9, 11.8, 0.1],
            ['Pepaya', 'Buah', 'potong', 150, 43, 0.5, 10.8, 0.3],
            ['Semangka', 'Buah', 'potong', 180, 30, 0.6, 7.6, 0.2],
            ['Melon', 'Buah', 'potong', 150, 34, 0.8, 8.2, 0.2],
            ['Mangga Harum Manis', 'Buah', 'buah', 200, 60, 0.8, 15.0, 0.4],
            ['Alpukat', 'Buah', 'buah', 150, 160, 2.0, 8.5, 14.7],
            ['Buah Naga Merah', 'Buah', 'buah', 180, 50, 1.1, 11.0, 0.4],
            ['Pir', 'Buah', 'buah', 160, 57, 0.4, 15.2, 0.1],
            ['Anggur', 'Buah', 'porsi', 100, 69, 0.7, 18.1, 0.2],
            ['Stroberi', 'Buah', 'porsi', 100, 32, 0.7, 7.7, 0.3],
            ['Salak', 'Buah', 'buah', 45, 82, 0.8, 20.9, 0.4],
            ['Kurma', 'Buah', 'butir', 10, 282, 2.5, 75.0, 0.4],

            // === MINUMAN (15) ===
            ['Air Putih', 'Minuman', 'gelas', 250, 0, 0.0, 0.0, 0.0],
            ['Teh Tawar Panas / Es', 'Minuman', 'gelas', 250, 1, 0.0, 0.2, 0.0],
            ['Es Teh Manis', 'Minuman', 'gelas', 250, 36, 0.0, 9.0, 0.0],
            ['Kopi Hitam Tanpa Gula (Americano)', 'Minuman', 'gelas', 240, 2, 0.1, 0.0, 0.0],
            ['Kopi Susu Gula Aren', 'Minuman', 'gelas', 250, 76, 1.8, 12.0, 2.4],
            ['Caffe Latte (Tanpa Gula)', 'Minuman', 'gelas', 250, 48, 2.6, 4.2, 2.3],
            ['Susu Full Cream', 'Minuman', 'gelas', 250, 61, 3.2, 4.8, 3.3],
            ['Susu Low Fat / Skim', 'Minuman', 'gelas', 250, 42, 3.4, 5.0, 1.0],
            ['Susu Kedelai Tanpa Gula', 'Minuman', 'gelas', 250, 33, 2.9, 1.8, 1.6],
            ['Jus Alpukat (Sedikit Gula/Susu)', 'Minuman', 'gelas', 250, 112, 1.8, 12.5, 6.2],
            ['Jus Jeruk Murni', 'Minuman', 'gelas', 250, 45, 0.7, 10.4, 0.2],
            ['Es Jeruk Peras Manis', 'Minuman', 'gelas', 250, 48, 0.4, 11.8, 0.1],
            ['Minuman Boba / Milk Tea Manis', 'Minuman', 'gelas', 350, 96, 1.2, 18.5, 2.2],
            ['Minuman Soda Manis (Cola)', 'Minuman', 'kaleng', 330, 42, 0.0, 10.6, 0.0],
            ['Air Kelapa Muda Murni', 'Minuman', 'gelas', 250, 19, 0.7, 3.7, 0.2],

            // === CAMILAN (15) ===
            ['Pisang Goreng', 'Camilan', 'buah', 65, 235, 2.2, 32.0, 11.0],
            ['Tahu Isi Goreng', 'Camilan', 'buah', 65, 205, 6.8, 16.0, 12.8],
            ['Bakwan Sayur (Bala-Bala)', 'Camilan', 'buah', 55, 245, 4.2, 27.0, 13.5],
            ['Tempe Mendoan', 'Camilan', 'potong', 60, 230, 11.5, 16.5, 13.0],
            ['Risoles Ragout / Mayo', 'Camilan', 'buah', 65, 235, 6.2, 24.0, 12.5],
            ['Lemper Ayam', 'Camilan', 'buah', 70, 190, 5.2, 31.0, 5.0],
            ['Martabak Manis Cokelat Kacang', 'Camilan', 'potong', 85, 315, 6.5, 44.0, 12.8],
            ['Donat Gula / Glaze', 'Camilan', 'buah', 60, 405, 5.2, 50.0, 20.5],
            ['Kerupuk Putih / Udang', 'Camilan', 'buah', 15, 480, 4.0, 68.0, 21.0],
            ['Kacang Tanah Panggang', 'Camilan', 'genggam', 30, 585, 23.7, 21.5, 49.7],
            ['Almond Panggang', 'Camilan', 'genggam', 28, 598, 21.0, 21.0, 52.5],
            ['Yogurt Plain Low Fat', 'Camilan', 'cup', 120, 63, 5.3, 7.0, 1.6],
            ['Biskuit Gandum / Oat', 'Camilan', 'keping', 15, 450, 7.5, 66.0, 17.0],
            ['Keripik Kentang', 'Camilan', 'bungkus', 35, 536, 7.0, 53.0, 34.6],
            ['Cokelat Hitam (Dark Chocolate 70%)', 'Camilan', 'potong', 20, 598, 7.8, 46.0, 43.0],
        ];
    }

    /**
     * Format: [name, category, met, supports_distance, default_speed_kmh]
     * Values aligned with Compendium of Physical Activities.
     *
     * @return array<int, array{0:string,1:string,2:float,3:int,4:?float}>
     */
    public static function activities(): array
    {
        return [
            // === JALAN & LARI (7) ===
            ['Jalan Santai', 'Jalan & Lari', 3.3, 1, 4.5],
            ['Jalan Cepat (Brisk Walk)', 'Jalan & Lari', 4.3, 1, 6.0],
            ['Jalan Menanjak / Hiking Ringan', 'Jalan & Lari', 6.0, 1, 4.0],
            ['Jogging / Lari Santai', 'Jalan & Lari', 8.3, 1, 8.0],
            ['Lari Sedang', 'Jalan & Lari', 9.8, 1, 10.0],
            ['Lari Cepat', 'Jalan & Lari', 11.8, 1, 12.0],
            ['Treadmill Jalan / Lari Ringan', 'Jalan & Lari', 6.5, 1, 6.5],

            // === KARDIO (7) ===
            ['Bersepeda Santai', 'Kardio', 6.8, 1, 16.0],
            ['Bersepeda Sedang / Cepat', 'Kardio', 8.5, 1, 20.0],
            ['Sepeda Statis (Sedang)', 'Kardio', 7.0, 0, null],
            ['Berenang Santai', 'Kardio', 6.0, 1, 2.0],
            ['Berenang Gaya Bebas (Sedang)', 'Kardio', 8.3, 1, 2.8],
            ['Lompat Tali (Skipping)', 'Kardio', 11.0, 0, null],
            ['Senam Aerobik / Zumba', 'Kardio', 6.5, 0, null],

            // === KEKUATAN (5) ===
            ['Angkat Beban / Gym (Sedang)', 'Kekuatan', 5.0, 0, null],
            ['Kalistenik (Push-up, Squat, Plank)', 'Kekuatan', 4.5, 0, null],
            ['HIIT / Latihan Sirkuit', 'Kekuatan', 8.0, 0, null],
            ['Yoga', 'Kekuatan', 3.0, 0, null],
            ['Pilates / Peregangan Aktif', 'Kekuatan', 3.5, 0, null],

            // === OLAHRAGA PERMAINAN (5) ===
            ['Badminton (Rekreasi / Sedang)', 'Olahraga Permainan', 5.5, 0, null],
            ['Futsal / Sepak Bola', 'Olahraga Permainan', 8.0, 0, null],
            ['Basket', 'Olahraga Permainan', 6.5, 0, null],
            ['Tenis Lapangan / Padel', 'Olahraga Permainan', 7.3, 0, null],
            ['Tenis Meja (Pingpong)', 'Olahraga Permainan', 4.0, 0, null],

            // === AKTIVITAS HARIAN (5) ===
            ['Naik Tangga', 'Aktivitas Harian', 8.0, 0, null],
            ['Menyapu / Mengepel Rumah', 'Aktivitas Harian', 3.3, 0, null],
            ['Mencuci Motor / Mobil', 'Aktivitas Harian', 3.5, 0, null],
            ['Berkebun Ringan', 'Aktivitas Harian', 3.8, 0, null],
            ['Belanja Jalan Kaki (Pasar / Mall)', 'Aktivitas Harian', 2.8, 1, 3.5],
        ];
    }

    public static function seedIfEmpty(PDO $pdo): void
    {
        $foodCount = (int) $pdo->query('SELECT COUNT(*) FROM foods')->fetchColumn();
        if ($foodCount === 0) {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO foods (name, category, default_unit, serving_grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_custom, is_favorite)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)'
                );
                foreach (self::foods() as $row) {
                    $stmt->execute($row);
                }
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
        }

        $actCount = (int) $pdo->query('SELECT COUNT(*) FROM activities')->fetchColumn();
        if ($actCount === 0) {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO activities (name, category, met, supports_distance, default_speed_kmh, is_custom, is_favorite)
                     VALUES (?, ?, ?, ?, ?, 0, 0)'
                );
                foreach (self::activities() as $row) {
                    $stmt->execute($row);
                }
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
        }
    }
}
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
