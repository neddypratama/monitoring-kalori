<<<<<<< HEAD
<?php
declare(strict_types=1);

final class Assert
{
    private static int $passed = 0;
    private static int $failed = 0;

    public static function test(string $name, callable $fn): void
    {
        try {
            $fn();
            self::$passed++;
            echo "  [PASS] {$name}\n";
        } catch (Throwable $e) {
            self::$failed++;
            echo "  [FAIL] {$name}: {$e->getMessage()}\n";
        }
    }

    public static function equals(mixed $expected, mixed $actual, string $msg = ''): void
    {
        if ($expected !== $actual) {
            $prefix = $msg !== '' ? "{$msg} — " : '';
            throw new RuntimeException(
                $prefix . 'Expected ' . json_encode($expected, JSON_UNESCAPED_UNICODE)
                . ', got ' . json_encode($actual, JSON_UNESCAPED_UNICODE)
            );
        }
    }

    public static function approx(float $expected, float $actual, float $delta = 0.01, string $msg = ''): void
    {
        if (abs($expected - $actual) > $delta) {
            $prefix = $msg !== '' ? "{$msg} — " : '';
            throw new RuntimeException(
                $prefix . "Expected ~{$expected} (±{$delta}), got {$actual}"
            );
        }
    }

    public static function true(bool $condition, string $msg = 'Expected true, got false'): void
    {
        if (!$condition) {
            throw new RuntimeException($msg);
        }
    }

    public static function throws(string $exceptionClass, callable $fn, string $msg = ''): void
    {
        try {
            $fn();
        } catch (Throwable $e) {
            if ($e instanceof $exceptionClass) {
                return;
            }
            throw new RuntimeException(
                ($msg !== '' ? "{$msg} — " : '') . "Expected {$exceptionClass}, got " . get_class($e) . ": {$e->getMessage()}"
            );
        }
        throw new RuntimeException(($msg !== '' ? "{$msg} — " : '') . "Expected {$exceptionClass}, but no exception was thrown");
    }

    public static function summary(string $suiteName): int
    {
        $total = self::$passed + self::$failed;
        echo "\n{$suiteName}: " . self::$passed . "/{$total} passed";
        if (self::$failed > 0) {
            echo " (" . self::$failed . " FAILED)\n";
            return 1;
        }
        echo " (ALL PASS)\n";
        return 0;
    }
}
=======
<?php
declare(strict_types=1);

final class Assert
{
    private static int $passed = 0;
    private static int $failed = 0;

    public static function test(string $name, callable $fn): void
    {
        try {
            $fn();
            self::$passed++;
            echo "  [PASS] {$name}\n";
        } catch (Throwable $e) {
            self::$failed++;
            echo "  [FAIL] {$name}: {$e->getMessage()}\n";
        }
    }

    public static function equals(mixed $expected, mixed $actual, string $msg = ''): void
    {
        if ($expected !== $actual) {
            $prefix = $msg !== '' ? "{$msg} — " : '';
            throw new RuntimeException(
                $prefix . 'Expected ' . json_encode($expected, JSON_UNESCAPED_UNICODE)
                . ', got ' . json_encode($actual, JSON_UNESCAPED_UNICODE)
            );
        }
    }

    public static function approx(float $expected, float $actual, float $delta = 0.01, string $msg = ''): void
    {
        if (abs($expected - $actual) > $delta) {
            $prefix = $msg !== '' ? "{$msg} — " : '';
            throw new RuntimeException(
                $prefix . "Expected ~{$expected} (±{$delta}), got {$actual}"
            );
        }
    }

    public static function true(bool $condition, string $msg = 'Expected true, got false'): void
    {
        if (!$condition) {
            throw new RuntimeException($msg);
        }
    }

    public static function throws(string $exceptionClass, callable $fn, string $msg = ''): void
    {
        try {
            $fn();
        } catch (Throwable $e) {
            if ($e instanceof $exceptionClass) {
                return;
            }
            throw new RuntimeException(
                ($msg !== '' ? "{$msg} — " : '') . "Expected {$exceptionClass}, got " . get_class($e) . ": {$e->getMessage()}"
            );
        }
        throw new RuntimeException(($msg !== '' ? "{$msg} — " : '') . "Expected {$exceptionClass}, but no exception was thrown");
    }

    public static function summary(string $suiteName): int
    {
        $total = self::$passed + self::$failed;
        echo "\n{$suiteName}: " . self::$passed . "/{$total} passed";
        if (self::$failed > 0) {
            echo " (" . self::$failed . " FAILED)\n";
            return 1;
        }
        echo " (ALL PASS)\n";
        return 0;
    }
}
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
