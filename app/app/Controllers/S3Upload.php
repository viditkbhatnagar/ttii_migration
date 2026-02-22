<?php

namespace App\Controllers;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;
use CodeIgniter\Controller;

class S3Upload extends Controller
{
    private function getS3Config(): array
    {
        $accessKey = trim((string) env('AWS_ACCESS_KEY_ID'));
        $secretKey = trim((string) env('AWS_SECRET_ACCESS_KEY'));
        $region = trim((string) env('AWS_DEFAULT_REGION')) ?: 'ap-south-1';

        if ($accessKey === '' || $secretKey === '') {
            throw new \RuntimeException('S3 credentials are not configured');
        }

        return [
            'version' => 'latest',
            'region' => $region,
            'credentials' => [
                'key' => $accessKey,
                'secret' => $secretKey,
            ],
        ];
    }

    private function getBucketName(): string
    {
        return trim((string) env('AWS_BUCKET')) ?: 'pscnet';
    }

    public function index()
    {
        $s3 = new S3Client($this->getS3Config());

        $bucketName = $this->getBucketName();
        $filePath = 'assets/images/error.svg'; // Path to the file to upload
        $key = 'questions/'.md5(basename($filePath)).'.svg'; // Key for the file in S3

        try {
            $result = $s3->putObject([
                'Bucket' => $bucketName,
                'Key'    => $key,
                'SourceFile' => $filePath,
            ]);

            echo "File uploaded: " . $result['ObjectURL'];
        } catch (AwsException $e) {
            // Output error message if fails
            echo $e->getMessage();
        }
    }

    public function list_files()
    {
        $s3Client = new S3Client($this->getS3Config());

        $bucket = $this->getBucketName();

        try {
            $results = $s3Client->getPaginator('ListObjects', [
                'Bucket' => $bucket
            ]);

            foreach ($results as $result) {
                foreach ($result['Contents'] as $object) {
//                    echo $object['Key'] . '<br>';
                    $this->generateDownloadLink($object['Key']).'<hr>';
                }
            }
        } catch (AwsException $e) {
            // Output error message if fails
            echo $e->getMessage();
        }
    }

    public function generateDownloadLink($fileKey)
    {
        $s3Client = new S3Client($this->getS3Config());

        $bucket = $this->getBucketName();

        try {
            // Setting the expiration time for the pre-signed URL
            $cmd = $s3Client->getCommand('GetObject', [
                'Bucket' => $bucket,
                'Key'    => $fileKey
            ]);

            $request = $s3Client->createPresignedRequest($cmd, '+20 minutes'); // URL valid for 20 minutes

            // Get the actual presigned-url
            $presignedUrl = (string) $request->getUri();

            echo "Download link: " . $presignedUrl;
        } catch (AwsException $e) {
            // Output error message if fails
            echo $e->getMessage();
        }
    }

    public function downloadBatch()
    {
        $s3Client = new S3Client([
            // Configuration...
        ]);

        $bucket = 'your-bucket-name';
        $zipFileName = 'batch_upload.zip';
        $saveAs = '/local/path/' . $zipFileName;

        // Download the zip file from S3
        try {
            $result = $s3Client->getObject([
                'Bucket' => $bucket,
                'Key'    => 'your-folder/' . $zipFileName,
                'SaveAs' => $saveAs,
            ]);

            // Extract files
            $zip = new ZipArchive();
            if ($zip->open($saveAs) === TRUE) {
                $zip->extractTo('/path/to/extract/');
                $zip->close();
                echo 'Files extracted';
            } else {
                echo 'Failed to open zip file';
            }
        } catch (AwsException $e) {
            echo $e->getMessage();
        }
    }

    public function uploadBatch()
    {
        $s3Client = new S3Client([
            // Configuration...
        ]);

        $bucket = 'your-bucket-name';
        $zip = new ZipArchive();
        $zipFileName = 'batch_upload.zip';

        if ($zip->open($zipFileName, ZipArchive::CREATE) === TRUE) {
            // Add files to the zip file
            $zip->addFile('/path/to/first/file', 'first_file.jpg');
            $zip->addFile('/path/to/second/file', 'second_file.jpg');
            // Add as many files as needed
            $zip->close();

            // Upload the zip file to S3
            try {
                $result = $s3Client->putObject([
                    'Bucket' => $bucket,
                    'Key'    => 'your-folder/' . $zipFileName,
                    'SourceFile' => $zipFileName,
                ]);

                echo "Batch file uploaded to: " . $result['ObjectURL'];
            } catch (AwsException $e) {
                echo $e->getMessage();
            }
        } else {
            echo 'Failed to create zip file';
        }
    }

    public function compress_image(){
        $source = 'screenshot1.png';
        $quality = '90';
        $destination = 'compressed_'.$quality.'_'.uniqid().'screenshot.png';
        $this->compressImage($source, $destination, $quality);

        $quality = '80';
        $destination = 'compressed_'.$quality.'_'.uniqid().'screenshot.png';
        $this->compressImage($source, $destination, $quality);

    }

    private function compressImage($source, $destination, $quality, $newWidth = '1000') {
        // Get image info
        $imgInfo = getimagesize($source);
        $mime = $imgInfo['mime'];
        $oldWidth = $imgInfo[0];
        $oldHeight = $imgInfo[1];

        // Calculate new height to maintain aspect ratio
        $newHeight = ($oldHeight / $oldWidth) * $newWidth;

        // Create a new image from file
        switch($mime){
            case 'image/jpeg':
                $image = imagecreatefromjpeg($source);
                break;
            case 'image/png':
                $image = imagecreatefrompng($source);
                break;
            case 'image/gif':
                $image = imagecreatefromgif($source);
                break;
            default:
                $image = imagecreatefromjpeg($source);
        }

        // Resize the image
        $imageResized = imagescale($image, $newWidth, $newHeight);

        // Save image to destination with specified quality
        imagejpeg($imageResized, $destination, $quality);

        // Free up memory
        imagedestroy($image);
        imagedestroy($imageResized);

        // Return compressed image size
        return filesize($destination);
    }


}
