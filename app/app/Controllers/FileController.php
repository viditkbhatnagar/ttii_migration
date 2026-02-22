<?php namespace App\Controllers;

class FileController extends BaseController
{
    public function serveFile()
    {
        helper('file_security');

        $encodedItem = (string) $this->request->getGet('item');
        if ($encodedItem === '') {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('File not found');
        }

        $decodedPath = decode_file($encodedItem);
        if (!is_string($decodedPath) || $decodedPath === '') {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('File not found');
        }

        $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'aac', 'ogg', 'wav', 'm4a', 'txt', 'csv', 'zip'];
        $candidatePath = resolve_safe_write_file_path($decodedPath, $allowedExtensions);
        if ($candidatePath === '') {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('File not found');
        }

        return $this->response
            ->setHeader('Content-Type', mime_content_type($candidatePath) ?: 'application/octet-stream')
            ->setHeader('Content-Length', (string) filesize($candidatePath))
            ->setBody((string) file_get_contents($candidatePath));
    }
}
