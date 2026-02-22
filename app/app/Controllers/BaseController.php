<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\CLIRequest;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;

/**
 * Class BaseController
 *
 * BaseController provides a convenient place for loading components
 * and performing functions that are needed by all your controllers.
 * Extend this class in any new controllers:
 *     class Home extends BaseController
 *
 * For security, be sure to declare any new methods as protected or private.
 */
abstract class BaseController extends Controller
{
    protected $request;
    protected $helpers = [];


    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        parent::initController($request, $response, $logger);
    }
    
    public function upload_file($upload_folder, $file_name, $allowed_types = null, $full_url = true, $additional = false)
    {
        $file = $this->request->getFile($file_name);

        if ($file === null) {
            throw new \RuntimeException('No file uploaded with name: ' . $file_name);
        }

        if ($file->isValid() && !$file->hasMoved()) {
            $fileExt = $file->getClientExtension();

            // Check if file type is allowed
            if (!is_null($allowed_types) && !in_array($fileExt, $allowed_types)) {
                log_message('error', 'Disallowed file type: ' . $fileExt);
                return false;
            }

            // Determine file type for processing
            if ($fileExt == 'pdf') {
                $return['file_type'] = 'pdf';
            } elseif (in_array($fileExt, ['mp3', 'aac'])) {
                $return['file_type'] = 'audio';
            } else {
                $return['file_type'] = 'image';
            }

            // Set upload path
            $uploadPath = $additional 
                ? FCPATH . 'uploads/' . $upload_folder . '/' . date("Ym") . '/' . $additional 
                : FCPATH . 'uploads/' . $upload_folder . '/' . date("Ym");

            // Create directory if it doesn't exist
            if (!is_dir($uploadPath)) {
                mkdir($uploadPath, 0777, true);
            }

            // Move the file
            $file->move($uploadPath, $file->getRandomName());

            // Build the return data for the uploaded file
            $return['file'] = $full_url 
                ? 'uploads/' . $upload_folder . '/' . date("Ym") . '/' . ($additional ? $additional . '/' : '') . $file->getName()
                : date("Ym") . '/' . ($additional ? $additional . '/' : '') . $file->getName();

            return $return;
        } else {
            // Handle error
            log_message('error', $file->getErrorString() . '(' . $file->getError() . ')');
            return false;
        }
    }
    
    
       public function upload_file_multiple($upload_folder, $file_name, $allowed_types = null, $full_url = true): array
    {
        $files = $this->request->getFiles($file_name);
        $return = [];
        // log_message('error','$answer_files : '.print_r($files[$file_name],true));
        if (isset($files[$file_name]) && !empty($files[$file_name])) {
            // UPLOAD FILE
            $uploadPath = FCPATH . 'uploads/' . $upload_folder . '/' . date("m-Y") . '/' . date('W');
            if (!is_dir($uploadPath)) {
                mkdir($uploadPath, 0777, true);
            }
    
            // Handle multiple file uploads
            foreach ($files[$file_name] as $file) {
                $fileInfo = [
                    'file' => '',
                    'status' => false,
                    'file_type' => '',
                ];
    
                if ($file->isValid() && !$file->hasMoved()) {
                    $fileExt = $file->getClientExtension();
    
                    if ($fileExt == 'pdf') {
                        $fileInfo['file_type'] = 'pdf';
                    } elseif (in_array($fileExt, ['mp3', 'ogg', 'aac', 'wav', 'm4a', 'wma'])) {
                        $fileInfo['file_type'] = 'audio';
                    } elseif (in_array($fileExt, ['xls', 'xlsx'])) {
                        $fileInfo['file_type'] = 'excel';
                    } elseif ($fileExt == 'csv') {
                        $fileInfo['file_type'] = 'csv';
                    } else {
                        $fileInfo['file_type'] = 'image';
                    }
    
                    // Check if file type is allowed
                    if (!is_null($allowed_types) && !in_array($fileExt, $allowed_types)) {
                        log_message('error', 'Disallowed file type: ' . $fileExt);
                        continue;
                    }
    
                    // Move file to the upload path
                    $file->move($uploadPath, $file->getRandomName());
    
                    if ($full_url) {
                        $fileInfo['file'] = 'uploads/' . $upload_folder . '/' . date("m-Y") . '/' . date('W') . '/' . $file->getName();
                    } else {
                        $fileInfo['file'] = date("mY") . '/' . date('W') . '/' . $file->getName();
                    }
    
                    $fileInfo['status'] = true;
                } else {
                    // Handle error
                    log_message('error', $file->getErrorString() . '(' . $file->getError() . ')');
                }
    
                $return[] = $fileInfo;
            }
        }
    
        return $return;
    }



    public function upload_multiple_files($upload_folder, $file_name, $allowed_types = null, $full_url = true, $additional = false)
    {
        // Get all files with the given name
        $files = $this->request->getFiles($file_name);

        // Log the received files for debugging
        log_message('debug', 'Received files: ' . print_r($files, true));

        // Check if files is an array and not empty
        if (!is_array($files) || empty($files)) {
            log_message('error', 'No files uploaded with name: ' . $file_name);
            return false; // Return false or handle the error accordingly
        }

        $uploaded_files = []; // Array to store uploaded file details

        foreach ($files as $file) {
            // Check if file is a valid instance of File
            if ($file instanceof \CodeIgniter\Files\File && $file->isValid() && !$file->hasMoved()) {
                $fileExt = $file->getClientExtension();

                // Check if file type is allowed
                if (!is_null($allowed_types) && !in_array($fileExt, $allowed_types)) {
                    log_message('error', 'Disallowed file type: ' . $fileExt);
                    continue; // Skip to the next file if the type is not allowed
                }

                // Determine file type for processing
                if ($fileExt == 'pdf') {
                    $return['file_type'] = 'pdf';
                } elseif (in_array($fileExt, ['mp3', 'aac'])) {
                    $return['file_type'] = 'audio';
                } else {
                    $return['file_type'] = 'image';
                }

                // Set upload path
                $uploadPath = $additional 
                    ? FCPATH . 'uploads/' . $upload_folder . '/' . date("Ym") . '/' . $additional 
                    : FCPATH . 'uploads/' . $upload_folder . '/' . date("Ym");

                // Create the upload directory if it doesn't exist
                if (!is_dir($uploadPath)) {
                    mkdir($uploadPath, 0777, true);
                }

                // Move the file to the upload path
                $file->move($uploadPath, $file->getRandomName());

                // Build the return data for the uploaded file
                $return['file'] = $full_url 
                    ? 'uploads/' . $upload_folder . '/' . date("Ym") . '/' . ($additional ? $additional . '/' : '') . $file->getName()
                    : date("Ym") . '/' . ($additional ? $additional . '/' : '') . $file->getName();

                // Add the uploaded file information to the array
                $uploaded_files[] = $return; // Append the return array for this file to the main array
            } else {
                // Handle error for this specific file
                if ($file instanceof \CodeIgniter\Files\File) {
                    log_message('error', $file->getErrorString() . '(' . $file->getError() . ')');
                } else {
                    log_message('error', 'Not a valid file object for uploaded files.');
                }
            }
        }

        // Return an array of uploaded file details
        return $uploaded_files;
    }
    
    
    
    public function upload_files($upload_folder, $file, $allowed_types = null, $full_url = true, $additional = false)
    {
        // Check if `$file` is an instance of `UploadedFile` or a string
        if (is_string($file)) {
            $file = $this->request->getFile($file);
        }
    
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $path = FCPATH . 'uploads/' . $upload_folder;
            $file->move($path, $newName);
    
            // Return file info or any additional data if needed
            return [
                'file_type' => 'image',
                'file' => 'uploads/' . $upload_folder . '/' . $newName
            ];
        }
    
        return false;
    }


    // Create slug
    public function create_slug($string)
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '_', $string)));
        return $slug;
    }
    
    public function upload_base64_image($upload_folder, $base64_image)
    {
        // Check if base64 image is provided
        if (empty($base64_image)) {
            throw new \RuntimeException('No base64 image data provided.');
        }
    
        // Decode base64 image
        $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64_image));
        if ($imageData === false) {
            throw new \RuntimeException('Invalid base64 image data.');
        }
    
        // Set upload path
        $uploadPath = FCPATH . 'uploads/' . $upload_folder . '/' . date("Ym");
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0777, true);
        }
    
        // Generate unique file name
        $fileName = uniqid('image_', true) . '.jpg';
        $filePath = $uploadPath . '/' . $fileName;
    
        // Save image to file
        if (file_put_contents($filePath, $imageData)) {
            return [
                'file' => 'uploads/' . $upload_folder . '/' . date("Ym") . '/' . $fileName,
                'file_type' => 'image',
            ];
        } else {
            throw new \RuntimeException('Failed to save the image.');
        }
    }
    
    
    public function custom_upload_file($folder, $file, $allowed_types = null)
    {
        if ($file->isValid() && !$file->hasMoved()) {
            $fileExt = $file->getClientExtension();
    
            if (!is_null($allowed_types) && !in_array($fileExt, $allowed_types)) {
                log_message('error', 'Disallowed file type: ' . $fileExt);
                return false;
            }
    
            $uploadPath = FCPATH . 'uploads/' . $folder . '/' . date("Ym");
            if (!is_dir($uploadPath)) {
                mkdir($uploadPath, 0777, true);
            }
    
            // Move the file
            $fileName = $file->getRandomName();
            $file->move($uploadPath, $fileName);
    
            // Return file path
            return [
                'file' => 'uploads/' . $folder . '/' . date("Ym") . '/' . $fileName,
                'file_type' => $fileExt,
            ];
    
            $return['file'] = 'uploads/' . $folder . '/' . date("Ym") . '/' . $file->getName();
        } else {
            log_message('error', $file->getErrorString() . '(' . $file->getError() . ')');
            return false;
        }
    }

    

}
