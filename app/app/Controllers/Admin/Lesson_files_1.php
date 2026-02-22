<?php
namespace App\Controllers\Admin;
use App\Models\Batch_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;
use App\Models\Lesson_files_report_model;
use App\Models\Vimeo_videolinks_model;


class Lesson_files extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;
    private $subject_model;
    private $lesson_model;
    private $lesson_file_model;


    public function __construct()
    {
        parent::__construct();
        $this->batch_model = new Batch_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->lesson_files_report_model = new Lesson_files_report_model();       
        $this->vimeo_videolinks_model = new Vimeo_videolinks_model();

    }

    public function index($lesson_id){
        
        $this->data['list_items'] = $this->lesson_file_model->get(['lesson_id' => $lesson_id])->getResultArray();

        $lesson                     = $this->lesson_model->get(['id' => $lesson_id])->getRowArray();
        $this->data['course_id']    = $lesson['course_id'];
        $this->data['lesson_id']    = $lesson_id;
        $this->data['lesson_title'] = $lesson['title'];
        
        $this->data['page_title'] = 'Lesson Files';
        $this->data['page_name'] = 'Lesson_files/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add($id,$type){
        // print_r($type); exit();
        $this->data['lesson_id'] = $id;
        $this->data['lesson_type'] = $type;
        echo view('Admin/Lesson_files/ajax_add', $this->data);
    }


    public function add()
    {
                $logger = service('logger');

        if($this->request->getMethod() === 'post')
        {
            $lesson = $this->request->getPost('lesson_id');
            $course = $this->lesson_model->get(['id'=>$lesson],['course_id'])->getRowArray();
                                    $logger->error('Database Error: ' . db_connect()->getLastQuery());

            $course_id = $course['course_id'];
            
            $lesson_provider = '';
            if ($this->request->getMethod() === 'post'){
                    $data = [
                        'title' => $this->request->getPost('title'),
                        'lesson_id' => $this->request->getPost('lesson_id'),
                        'summary' => $this->request->getPost('summary'),
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s'),
                    ];
                    
                    $lesson_type_array          = explode('-', $this->request->getPost('lesson_type'));
                    $lesson_type                = $lesson_type_array[0];
                    $data['attachment_type']    = $lesson_type_array[1];
                    $data['lesson_type']        = $lesson_type;
                    
                    if ($lesson_type_array[1] == 'pdf') {
                        // $uploadedFileName = $this->request->getPost('uploadedFileName'); // Retrieve uploaded filename from hidden input
                        // $data['attachment'] = $uploadedFileName;
                        $attachment = $this->upload_file('lesson_files', 'uploadedFileName');
                        if($attachment){
                            $data['attachment'] = $attachment['file'];
                        }
                    }else if($lesson_type_array[1] == 'quiz'){
                    }
                    
                    if ($lesson_type == 'video') {
                        $lesson_provider = $this->request->getPost('lesson_provider');
                        // $attachment = $this->upload_file('lesson_files', 'attachment');
                        if ($lesson_provider == 'youtube' || $lesson_provider == 'vimeo') {
                            $data['video_url']  = $this->request->getPost('video_url');
                            $duration_formatter = explode(':', $this->request->getPost('duration'));
                            $hour               = sprintf('%02d', $duration_formatter[0]);
                            $min                = sprintf('%02d', $duration_formatter[1]);
                            $sec                = sprintf('%02d', $duration_formatter[2]);
                            $data['duration']       = $hour . ':' . $min . ':' . $sec;
                            $data['video_type']     = $lesson_provider;
                            $data['download_url']   = $this->request->getPost('download_url');
                            // $data['attachment'] = $attachment['file'];
                        }
                    }
                    
                    $data['is_practice']    = $this->request->getPost('is_practice') == 1 ? 1 : 0;
                    $data['free']           = $this->request->getPost('free') == 'on' ? 'on' : 'off';
    
                    
                    
                     $lesson_file_id = $this->lesson_file_model->add($data);
                    if ($lesson_file_id)
                    {
                        if($lesson_provider == 'vimeo')
                            {
                                $html5_url = get_vimeo_file_url($data['video_url']);
                                
                                $files      =   $html5_url['files'];
                                $downloads  =   $html5_url['downloads'];
                                
                                $files = array_reverse($files);
                                $downloads = array_reverse($downloads);
                                
                               
                                if(!empty($files))
                                {
                                     // Map downloads by rendition for quick lookup
                                    $downloadMap = [];
                                    foreach ($downloads as $download) {
                                        $downloadMap[$download['rendition']] = $download['link'];
                                    }
                                    $downloadMap['adaptive'] = '';
                                    
                                
                                    // Add download link to files
                                    foreach ($files as &$file) 
                                    {
                                        $file['download_link'] = $downloadMap[$file['rendition']] ?? null;
                                        
                                         if ($file['rendition'] === 'adaptive') 
                                         {
                                            $file['width'] = '1920'; // Default width for adaptive
                                            $file['height'] = '1080'; // Default height for adaptive
                                            
                                              $file = array_merge(
                                                    array_slice($file, 0, array_search('type', array_keys($file)) + 1, true),
                                                    ['width' => $file['width'], 'height' => $file['height']],
                                                    array_slice($file, array_search('type', array_keys($file)) + 1, null, true)
                                                );
                                        }
                                        
                                        
                                    }
                                    
                                    usort($files, function ($a, $b) {
                                            return strcmp($a['rendition'], $b['rendition']);
                                        });
                                        
                                         // Sort files by rendition, placing "adaptive" first
                                    usort($files, function ($a, $b) {
                                        if ($a['rendition'] === 'adaptive') return -1;
                                        if ($b['rendition'] === 'adaptive') return 1;
                                        return strcmp($a['rendition'], $b['rendition']);
                                    });
                                    
                                    
                                    foreach ($files as $val) {
                                            // Prepare data for insertion
                                            $vimeo_data = [
                                                'lesson_file_id' => $lesson_file_id,
                                                'quality' => isset($val['quality']) ? $val['quality'] : null,
                                                'rendition' => isset($val['rendition']) ? $val['rendition'] : null,
                                                'height' => isset($val['height']) ? $val['height'] : null, // Check for key existence
                                                'width' => isset($val['width']) ? $val['width'] : null,   // Check for key existence
                                                'type' => isset($val['type']) ? $val['type'] : null,
                                                'link' => isset($val['link']) ? $val['link'] : null,
                                                'fps' => isset($val['fps']) ? $val['fps'] : null,
                                                'size' => isset($val['size']) ? $val['size'] : null,
                                                'public_name' => isset($val['public_name']) ? $val['public_name'] : null,
                                                'size_short' => isset($val['size_short']) ? $val['size_short'] : null,
                                                'download_link' => isset($val['download_link']) ? $val['download_link'] : null,
                                                'created_by' => get_user_id(),
                                                'created_at' => date('Y-m-d H:i:s')
                                            ];
                                    
                                            // Insert into database
                                             $this->vimeo_videolinks_model->add($vimeo_data);

                                    }
                                    
                                }
                            }
                        
                        
                        
                        session()->setFlashdata('message_success', "Lesson Files Added Successfully!");
                    }else{
                        session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                    }
               
            }
            return redirect()->to(base_url('admin/course/details/'.$course_id));
        }
        else
        {
            return redirect()->to(base_url('admin/course/'));
        }
    }
    
    // public function upload_attachment()
    // {
    //     $response = []; // Initialize response array

    //     if ($this->request->isAJAX()) 
    //     {
    //         $attachment = $this->upload_file('lesson_files', 'file');
    //         if($attachment){
    //              $response['filename'] = $attachment['file'];
    //         }
    //         else
    //         {
    //             $response['error'] = 'Failed to upload file.';
    //         }
            
    //     } else {
    //         // Handle non-AJAX request
    //         $response['error'] = 'Invalid request method.';
    //     }

    //     // Return JSON response
    //     return $this->response->setJSON($response);
    // }

    public function ajax_edit($id){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->lesson_file_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Lesson_files/ajax_edit', $this->data);
    }

    public function edit($id){
        if($this->request->getMethod() === 'post'){
            $lesson_provider = '';
            $lesson = $this->lesson_file_model->get(['id'=>$id],['lesson_id'])->getRowArray();
            $course = $this->lesson_model->get(['id'=>$lesson],['course_id'])->getRowArray();
            
            $logger = service('logger');
            
            $course_id = $course['course_id'];
            $lesson_id = $lesson['lesson_id'];
        
            $data = [
                     'title' => $this->request->getPost('title'),
                    'lesson_id' => $lesson_id,
                    'summary' => $this->request->getPost('summary'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                $lesson_type_array          = explode('-', $this->request->getPost('lesson_type'));
                $lesson_type                = $lesson_type_array[0];
                $data['attachment_type']    = $lesson_type_array[1];
                $data['lesson_type']        = $lesson_type;
                
                if ($lesson_type_array[1] == 'pdf') {
                    //   $uploadedFileName = $this->request->getPost('uploadedFileName'); // Retrieve uploaded filename from hidden input
                    //   if(!empty($uploadedFileName))
                    //   {
                    //     $data['attachment'] = $uploadedFileName;
                    //   }
                    $attachment = $this->upload_file('lesson_files', 'uploadedFileName');
                    if($attachment){
                        $data['attachment'] = $attachment['file'];
                    }
                } else if($lesson_type_array[1] == 'quiz'){
                    
                }
                
                if ($lesson_type == 'video') {
                    $lesson_provider = $this->request->getPost('lesson_provider');
                    if ($lesson_provider == 'youtube' || $lesson_provider == 'vimeo') {
                        $data['video_url']  = $this->request->getPost('video_url');
                        $duration_formatter = explode(':', $this->request->getPost('duration'));
                        $hour               = sprintf('%02d', $duration_formatter[0]);
                        $min                = sprintf('%02d', $duration_formatter[1]);
                        $sec                = sprintf('%02d', $duration_formatter[2]);
                        $data['duration']       = $hour . ':' . $min . ':' . $sec;
                        $data['video_type']     = $lesson_provider;
                        $data['download_url']   = $this->request->getPost('download_url');
                    }
                }
                $data['free']           = $this->request->getPost('free') == 'on' ? 'on' : 'off';

            $response = $this->lesson_file_model->edit($data, ['id' => $id]);

            if ($response)
            {
                  $lesson_file_id = $id;
                if($lesson_provider == 'vimeo')
                {
                    $remove_existing = $this->vimeo_videolinks_model->remove(['lesson_file_id' =>$lesson_file_id]);
                                $html5_url = get_vimeo_file_url($data['video_url']);
                                
                                $files      =   $html5_url['files'];
                                $downloads  =   $html5_url['downloads'];
                                
                                $files = array_reverse($files);
                                $downloads = array_reverse($downloads);
                                
                               
                                if(!empty($files))
                                {
                                     // Map downloads by rendition for quick lookup
                                    $downloadMap = [];
                                    foreach ($downloads as $download) {
                                        $downloadMap[$download['rendition']] = $download['link'];
                                    }
                                    $downloadMap['adaptive'] = '';
                                    
                                
                                    // Add download link to files
                                    foreach ($files as &$file) 
                                    {
                                        $file['download_link'] = $downloadMap[$file['rendition']] ?? null;
                                        
                                         if ($file['rendition'] === 'adaptive') 
                                         {
                                            $file['width'] = '1920'; // Default width for adaptive
                                            $file['height'] = '1080'; // Default height for adaptive
                                            
                                              $file = array_merge(
                                                    array_slice($file, 0, array_search('type', array_keys($file)) + 1, true),
                                                    ['width' => $file['width'], 'height' => $file['height']],
                                                    array_slice($file, array_search('type', array_keys($file)) + 1, null, true)
                                                );
                                        }
                                        
                                        
                                    }
                                    
                                    usort($files, function ($a, $b) {
                                            return strcmp($a['rendition'], $b['rendition']);
                                        });
                                        
                                         // Sort files by rendition, placing "adaptive" first
                                    usort($files, function ($a, $b) {
                                        if ($a['rendition'] === 'adaptive') return -1;
                                        if ($b['rendition'] === 'adaptive') return 1;
                                        return strcmp($a['rendition'], $b['rendition']);
                                    });
                                    
                                    
                                    foreach ($files as $val) {
                               
                                            // Prepare data for insertion
                                            $vimeo_data = [
                                                'lesson_file_id' => $lesson_file_id,
                                                'quality' => isset($val['quality']) ? $val['quality'] : null,
                                                'rendition' => isset($val['rendition']) ? $val['rendition'] : null,
                                                'height' => isset($val['height']) ? $val['height'] : null, // Check for key existence
                                                'width' => isset($val['width']) ? $val['width'] : null,   // Check for key existence
                                                'type' => isset($val['type']) ? $val['type'] : null,
                                                'link' => isset($val['link']) ? $val['link'] : null,
                                                'fps' => isset($val['fps']) ? $val['fps'] : null,
                                                'size' => isset($val['size']) ? $val['size'] : null,
                                                'public_name' => isset($val['public_name']) ? $val['public_name'] : null,
                                                'size_short' => isset($val['size_short']) ? $val['size_short'] : null,
                                                'download_link' => isset($val['download_link']) ? $val['download_link'] : null,
                                                'created_by' => get_user_id(),
                                                'created_at' => date('Y-m-d H:i:s')
                                            ];
                                    
                                            // Insert into database
                                             $this->vimeo_videolinks_model->add($vimeo_data);

                                    }
                                    
                                }
                            }
                        
                session()->setFlashdata('message_success', "Lesson Files Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            
            return redirect()->to(base_url('admin/course/details/'.$course_id));
        }
        else
        {
            return redirect()->to(base_url('admin/course/'));
        }
        
    }

    public function ajax_view($id){
        $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
        $this->data['view_data'] = $this->batch_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Batch/ajax_view', $this->data);
    }

    public function delete($id){
        
        $lesson = $this->lesson_file_model->get(['id'=>$id],['lesson_id'])->getRowArray();
        $course = $this->lesson_model->get(['id'=>$lesson],['course_id'])->getRowArray();
        $course_id = $course['course_id'];
        
        if ($id > 0){
            if ($this->lesson_file_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Lesson Files Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/course/details/'.$course_id));
    }
    
    
    public function user_reports(){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        if($this->request->getGet()){
            $where = [];
            if($this->request->getGet('course_id') > 0){
                $where['course_id'] = $this->request->getGet('course_id');
            }
            
            if($this->request->getGet('lesson_id') > 0){
                $where['id'] = $this->request->getGet('lesson_id');
            }
            $lessons = $this->lesson_model->get($where)->getResultArray();
            $lesson_ids = array_column($lessons, 'id');
            if($lesson_ids != NULL){
                $lesson_files = $this->lesson_file_model->get(['lesson_id' => $lesson_ids])->getResultArray();
                $lesson_file_ids = array_column($lesson_files, 'id');
                $this->data['lesson_file'] = array_column($lesson_files, 'title', 'id');
                $this->data['student'] = array_column($this->users_model->get()->getResultArray(), 'name', 'id');
                $this->data['users_reports'] = $this->lesson_files_report_model->get(['lesson_file_id' => $lesson_file_ids])->getResultArray();
            }else{
                $this->data['users_reports'] = [];
            }
            
        }
        $this->data['page_title'] = 'User Reports';
        $this->data['page_name'] = 'Lesson_files/user_reports';
        return view('Admin/index', $this->data);
    }
    
    
    public function ajax_view_report($id){
        $file = $this->lesson_files_report_model->get(['id' => $id])->getRow();
        $this->data['file']  = base_url(get_file($file->report_file));
        $this->data['file_type'] = $file->file_type;
        echo view('Admin/Lesson_files/ajax_view_report_file', $this->data);
    }
    
    public function ajax_add_quiz($lessonid,$fileid){
        $this->data['lesson_id'] = $lessonid;
        $this->data['lesson_file_id'] = $fileid;
        echo view('Admin/Lesson_files/ajax_add_quiz', $this->data);
    }
    
     public function ajax_add_material($lessonid,$fileid){
        $this->data['lesson_id'] = $lessonid;
        $this->data['lesson_file_id'] = $fileid;
        echo view('Admin/Lesson_files/ajax_add_material', $this->data);
    }
    
     public function ajax_add_article($lessonid,$fileid){
        $this->data['lesson_id'] = $lessonid;
        $this->data['lesson_file_id'] = $fileid;
        echo view('Admin/Lesson_files/ajax_add_article', $this->data);
    }
    
    
     public function add_items()
    {
        $logger = service('logger');
        if($this->request->getMethod() === 'post')
        {
            $lesson = $this->request->getPost('lesson_id');
            $course = $this->lesson_model->get(['id'=>$lesson],['course_id'])->getRowArray();
            $logger->error('Database Error: ' . db_connect()->getLastQuery());

            $course_id = $course['course_id'];
            
    
            if ($this->request->getMethod() === 'post'){
                    $order = $this->lesson_file_model->get(['lesson_id' => $this->request->getPost('lesson_id')],[], ['order' => 'desc'], 1)->getRow()->order ?? 0;
                    
                    $data = [
                        'title' => $this->request->getPost('title'),
                        'parent_file_id' => $this->request->getPost('parent_file_id'),
                        'lesson_id' => $this->request->getPost('lesson_id'),
                        'summary' => $this->request->getPost('summary'),
                        'order'   => $order+1,
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s'),
                    ];
                    
                    $lesson_type_array          = explode('-', $this->request->getPost('lesson_type'));
                    $lesson_type                = $lesson_type_array[0];
                    $data['attachment_type']    = $lesson_type_array[1];
                    $data['lesson_type']        = $lesson_type;
                    
                    if ($lesson_type_array[1] == 'pdf') {
                        $uploadedFileName = $this->request->getPost('uploadedFileName'); // Retrieve uploaded filename from hidden input
                        $data['attachment'] = $uploadedFileName;
                    }else if ($lesson_type_array[1] == 'audio') {
                        if ($this->request->getFile('audio_file') && $this->request->getFile('audio_file')->isValid()) {
                            $audio_file = $this->upload_file('lesson_files','audio_file');
                            if($audio_file){
                    			$data['audio_file'] = $audio_file['file'];
                    		}else{
                    		    $data['audio_file'] = '';
                    		}
                        }	
                    } else if($lesson_type_array[1] == 'quiz'){
                        
                        // $data['mark'] = $this->request->getPost('mark');
                        // $data['have_minus_mark'] = $this->request->getPost('have_minus_mark');
                        // $data['minus_mark'] = $this->request->getPost('minus_mark');
                        // $data['publish_result'] = $this->request->getPost('publish_result');
                        // $data['from_date'] = $this->request->getPost('from_date');
                        // $data['from_time'] = $this->request->getPost('from_time');
                        // $data['to_date'] = $this->request->getPost('to_date');
                        // $data['to_time'] = $this->request->getPost('to_time');
                        
                        // $duration_formatter = explode(':', $this->request->getPost('duration'));
                        // $hour               = sprintf('%02d', $duration_formatter[0]);
                        // $min                = sprintf('%02d', $duration_formatter[1]);
                        // $sec                = sprintf('%02d', $duration_formatter[2]);
                        // $data['duration']       = $hour . ':' . $min . ':' . $sec;
                    }
                    else if($lesson_type_array[1] == 'article')
                    {
                        
                    }
                    
                    if ($lesson_type == 'video') {
                        $lesson_provider = $this->request->getPost('lesson_provider');
                        // $attachment = $this->upload_file('lesson_files', 'attachment');
                        if ($lesson_provider == 'youtube' || $lesson_provider == 'vimeo') {
                            $data['video_url']  = $this->request->getPost('video_url');
                            $duration_formatter = explode(':', $this->request->getPost('duration'));
                            $hour               = sprintf('%02d', $duration_formatter[0]);
                            $min                = sprintf('%02d', $duration_formatter[1]);
                            $sec                = sprintf('%02d', $duration_formatter[2]);
                            $data['duration']       = $hour . ':' . $min . ':' . $sec;
                            $data['lesson_provider']     = $lesson_provider;
                            $data['download_url']   = $this->request->getPost('download_url');
                            // $data['attachment'] = $attachment['file'];
                        }
                        $data['video_type']     = $this->request->getPost('video_type');
                        $html5_url = get_vimeo_file_url($this->request->getPost('video_url'));
                        if($html5_url['status'] == 'true'){
                            $data['html5_video_url']  = $html5_url['video_link'];
                        }
                    }
                    
                    $data['is_practice']    = $this->request->getPost('is_practice') == 1 ? 1 : 0;
                    $data['free']           = $this->request->getPost('free') == 'on' ? 'on' : 'off';
    
                    
                    
                    $cat_id = $this->lesson_file_model->add($data);
                    if ($cat_id){
                        session()->setFlashdata('message_success', "Updated Successfully!");
                    }else{
                        session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                    }
               
            }
            return redirect()->to(base_url('admin/lesson_files/index/'.$lesson));
        }
        else
        {
            return redirect()->to(base_url('admin/course/'));
        }
    }
    
    public function upload_attachment()
    {
        $response = []; // Initialize response array

        if ($this->request->isAJAX()) 
        {
            $attachment = $this->upload_file('lesson_files', 'file');
            if($attachment){
                $response['filename'] = $attachment['file'];
            }
            else
            {
                $response['error'] = 'Failed to upload file.';
            }
            
        } else {
            // Handle non-AJAX request
            $response['error'] = 'Invalid request method.';
        }

        // Return JSON response
        return $this->response->setJSON($response);
    }
    
    


}
