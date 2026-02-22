<?php
namespace App\Controllers\Centre;

use App\Controllers\Centre\CentreBaseController;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;
use App\Models\Folder_model;
use App\Models\File_model;
use App\Models\Centres_model;
use App\Models\Users_model;

class Resources extends CentreBaseController
{
    protected $folder_model;
    protected $file_model;
    protected $centres_model;
    protected $users_model;

    public function __construct()
    {
        parent::__construct();
        $this->folder_model = new Folder_model();
        $this->file_model = new File_model();
        $this->centres_model = new Centres_model();
        $this->users_model = new Users_model();

    }

    protected function formatFolderSize($path)
    {
        if (!is_dir($path)) return '0 bytes';
        
        $size = 0;
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path)) as $file) {
            $size += $file->getSize();
        }
        
        if ($size >= 1073741824) {
            return round($size / 1073741824, 2) . ' GB';
        } elseif ($size >= 1048576) {
            return round($size / 1048576, 2) . ' MB';
        } elseif ($size >= 1024) {
            return round($size / 1024, 2) . ' KB';
        }
        return $size . ' bytes';
    }

    private function getFolderSize($folder_id)
    {
        $total = 0;

        // Files inside this folder
        $files = $this->file_model->get(['folder_id' => $folder_id])->getResultArray();
        foreach ($files as $file) {
            $total += (int) $file['size'];
        }

        // Subfolders
        $subfolders = $this->folder_model->get(['parent_id' => $folder_id])->getResultArray();
        foreach ($subfolders as $sub) {
            $total += $this->getFolderSize($sub['id']);
        }

        return $total;
    }

    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B','KB','MB','GB','TB'];

        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);

        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    public function index($folder_id = null)
    {
        $this->data['folder_id'] = $folder_id;
        $this->data['current_folder'] = null;
        $this->data['folders'] = [];
        $this->data['files'] = [];

        $centre_id = $this->users_model->get(['id'=>get_user_id()])->getRowArray()['centre_id'] ?? null;
        
        if ($folder_id === null) {
            //$centre_folder_id = $this->centres_model->get(['id' => $centre_id])->getRowArray()['folder_id'] ?? null;
            // Show root-level folders
            $this->data['folders'] = $this->folder_model->get(['parent_id' => 0, 'centre_id' => $centre_id], ['id', 'name', 'parent_id'])->getResultArray();
            $this->data['files'] = $this->file_model->get(['folder_id' => 0, 'centre_id' => $centre_id], ['id', 'name', 'type', 'size', 'created_at'])->getResultArray();
        } else {
            // Show subfolders and files inside a clicked folder
            $this->data['current_folder'] = $this->folder_model->get(['id' => $folder_id,'centre_id' => $centre_id], ['id', 'name', 'parent_id'])->getRowArray();
            $this->data['folders'] = $this->folder_model->get(['parent_id' => $folder_id,'centre_id' => $centre_id], ['id', 'name'])->getResultArray();
            $this->data['files'] = $this->file_model->get(['folder_id' => $folder_id,'centre_id' => $centre_id], ['id', 'name', 'type', 'size', 'created_at'])->getResultArray();
            
             if (!$this->data['current_folder']) {
                // prevent access to folders of other centres
                throw new \CodeIgniter\Exceptions\PageNotFoundException('Folder not found.');
            }

            // Add formatted file sizes
            foreach ($this->data['files'] as &$file) {
                $file['formatted_size'] = $this->formatSize($file['size']);
            }
            foreach ($this->data['folders'] as &$folder) {
                $folderSize = $this->getFolderSize($folder['id']);
                $folder['size'] = $this->formatBytes($folderSize);
            }


        }

        $this->data['page_title'] = 'Resources' . ($this->data['current_folder'] ? ' - ' . $this->data['current_folder']['name'] : '');
        $this->data['page_name'] = 'Resources/index';

        return view('Centre/index', $this->data);
    }

    public function ajax_add($folder_id = null)
    {
        $data['parent_id'] = $folder_id; //assigning current folder_id to parent_id
        echo view('Centre/Resources/ajax_add', $data);
    }
    // ADD FOLDER
    public function add_folder()
    {
        if ($this->request->getMethod() === 'post') {
            $name = $this->request->getPost('name');
            $parent_id = $this->request->getPost('parent_id');
            
            $centre_id = $this->users_model->get(['id'=>get_user_id()])->getRowArray()['centre_id'];
            $data = [
                'name'        => $name,
                'parent_id'   => $parent_id,
                'centre_id'   => $centre_id ?? null ,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => get_user_id(),
            ];
    
            if ($this->folder_model->add($data)) {
                session()->setFlashdata('message_success', 'Folder added successfully!');
            } else {
                session()->setFlashdata('message_danger', 'Something went wrong!');
            }
    
            if($parent_id != 0){
                return redirect()->to(base_url('centre/resources/index/' . $parent_id));
            }
            return redirect()->to(base_url('centre/resources/index/'));
        }
    }

    
     public function delete_folder($id)
    {
        $folder = $this->folder_model->get(['id'=>$id])->getRowArray();
        $parent_id = $folder['parent_id']??'';
        if ($id > 0) {
            $this->deleteFolderRecursively($id);
            session()->setFlashdata('message_success', "Folder & contents deleted successfully!");
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

        return redirect()->to(base_url('centre/resources/index/'. ($parent_id ?? '')));
    }
    
    public function ajax_rename($id)
    {
        $folder = $this->folder_model->get(['id' => $id])->getRowArray();
        $data = [
            'folder' => $folder,
            'is_edit' => true       //flag to handle form logic in the modal
        ];
        
        echo view('Centre/Resources/ajax_add',$data); //reuse same view OF ADD
    }
    
    public function rename_folder($id = null)
    {
        if ($this->request->getMethod() === 'post') {
            $name = $this->request->getPost('name');
            $parent_id = $this->request->getPost('parent_id');
    
            $data = [
                'name'       => $name,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => get_user_id(),
            ];
    
            if ($this->folder_model->edit($data, ['id' => $id])) {
                session()->setFlashdata('message_success', 'Folder renamed successfully!');
            } else {
                session()->setFlashdata('message_danger', 'Something went wrong!');
            }
    
            return redirect()->to(base_url('centre/resources/index/' . $parent_id));
        }
    }
    
    // ADD FILE
    public function ajax_add_file($folder_id = null)
    {
        $data['folder_id'] = $folder_id ?? 0;
        return view('Centre/Resources/ajax_add_file', $data);
    }

    public function add_file()
    {
        if ($this->request->getMethod() === 'post') {
            $allowed = ['jpg','jpeg','png','gif','pdf','mp4','mp3','doc','docx','xls','xlsx','ppt','pptx','zip'];
            $ext = strtolower($this->request->getFile('file')->getExtension());

            if (!in_array($ext, $allowed)) {
                session()->setFlashdata('message_danger', 'File type not allowed');
                return redirect()->back();
            }

            $folder_id = $this->request->getPost('folder_id');
            $file_info = $this->upload_file('resources', 'file');
    
            if ($file_info) {
                $data = [
                    'folder_id'   => $folder_id,
                    'name'        => $this->request->getFile('file')->getClientName(),
                    'size'        => $this->request->getFile('file')->getSize(),
                    'type'        => $file_info['file_type'],
                    'path'        => $file_info['file'],
                    'centre_id'   => $this->users_model->get(['id'=>get_user_id()])->getRowArray()['centre_id'] ?? null,
                    'created_at'  => date('Y-m-d H:i:s'),
                    'created_by'  => get_user_id(), // assuming helper
                ];
    
                if ($this->file_model->add($data)) {
                    session()->setFlashdata('message_success', 'File uploaded successfully!');
                } else {
                    session()->setFlashdata('message_danger', 'Failed to save file info to DB.');
                }
            } else {
                session()->setFlashdata('message_danger', 'File upload failed or disallowed type.');
            }
    
            return redirect()->to(base_url('centre/resources/index/' . $folder_id));
        }
    }
    
    public function ajax_view_file($id){
        $this->data['view_data'] = $this->file_model->get(['id' => $id])->getRowArray();
        echo view('Centre/Resources/ajax_file_view', $this->data);
        
    }
    
    public function delete_file($id)
    {
        $file = $this->file_model->get(['id'=>$id])->getRowArray();
        $file_id = $file['id'];
        // $file = $this->file_model->get(['id'=>$id])->getRowArray();
        $folder_id = $file['folder_id'];
        if ($id > 0) {
            if ($this->file_model->remove(['id' => $file_id])) {
                session()->setFlashdata('message_success', "File Deleted Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

        return redirect()->to(base_url('centre/resources/index/'. ($folder_id ?? '')));
    }

//     public function view($file_id)
// {
//     $file = $this->file_model->get(['id' => $file_id])->getRowArray();
//     if (!$file) return redirect()->back()->with('error', 'File not found');

//     $file_path = WRITEPATH . 'uploads/' . $file['path'];
//     $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

//     // For viewable files (images/PDFs)
//     if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'pdf'])) {
//         return view('Centre/Resources/preview', [
//             'file_url' => base_url('writable/uploads/' . $file['path']),
//             'file_name' => $file['name'],
//             'file_type' => $ext
//         ]);
//     }
    
//     // For non-viewable files - force download
//     return $this->response->download($file_path, null);
// }



    private function deleteFolderRecursively($folder_id)
    {
        // delete all files in this folder
        $files = $this->file_model->get(['folder_id' => $folder_id])->getResultArray();
        foreach ($files as $file) {
            if (file_exists(WRITEPATH . 'uploads/' . $file['path'])) {
                unlink(WRITEPATH . 'uploads/' . $file['path']);
            }
            $this->file_model->remove(['id' => $file['id']]);
        }

        // get child folders
        $subfolders = $this->folder_model->get(['parent_id' => $folder_id])->getResultArray();
        foreach ($subfolders as $subfolder) {
            $this->deleteFolderRecursively($subfolder['id']);
        }

        // finally delete the folder
        $this->folder_model->remove(['id' => $folder_id]);
    }



    protected function formatSize($bytes)
    {
        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return round($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return round($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }
}