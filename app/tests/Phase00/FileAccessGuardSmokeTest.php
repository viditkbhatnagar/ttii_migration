<?php

use PHPUnit\Framework\TestCase;

final class FileAccessGuardSmokeTest extends TestCase
{
    private string $relativePath = 'phase00_smoke_guard/sample.txt';

    protected function setUp(): void
    {
        helper('file_security');

        $dir = WRITEPATH . 'phase00_smoke_guard';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents(WRITEPATH . $this->relativePath, 'phase00');
    }

    protected function tearDown(): void
    {
        $absoluteFile = WRITEPATH . $this->relativePath;
        if (is_file($absoluteFile)) {
            unlink($absoluteFile);
        }

        $dir = WRITEPATH . 'phase00_smoke_guard';
        if (is_dir($dir)) {
            @rmdir($dir);
        }
    }

    public function testSafeFileUnderWritePathIsResolved(): void
    {
        $resolvedPath = resolve_safe_write_file_path($this->relativePath, ['txt']);
        $this->assertNotSame('', $resolvedPath);
        $this->assertStringEndsWith('/phase00_smoke_guard/sample.txt', str_replace('\\', '/', $resolvedPath));
    }

    public function testTraversalAndDisallowedExtensionAreRejected(): void
    {
        $this->assertSame('', resolve_safe_write_file_path('../.env', ['txt', 'env']));
        $this->assertSame('', resolve_safe_write_file_path($this->relativePath, ['pdf']));
    }
}
