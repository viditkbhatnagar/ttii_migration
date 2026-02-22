<?php
namespace App\Controllers\Admin;
use App\Models\Batch_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;
use App\Models\Topic_model;
use App\Models\Lesson_file_model;
use App\Models\Vimeo_videolinks_model;
use App\Models\Languages_model;


class Lesson_files extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;
    private $subject_model;
    private $lesson_model;
    private $topic_model;
    private $lesson_file_model;
    private $languages_model;

    protected $is_syncing = false;


    public function __construct()
    {
        parent::__construct();
        $this->batch_model = new Batch_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
        $this->topic_model = new Topic_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->vimeo_videolinks_model = new Vimeo_videolinks_model();
        $this->languages_model = new Languages_model();
    }

    public function index($lesson_id){
        $this->data['list_items'] = $this->lesson_file_model->get(['lesson_id' => $lesson_id],null,['order'=>'asc'])->getResultArray();
        $lesson                     = $this->lesson_model->get(['id' => $lesson_id])->getRowArray();
        $this->data['course_id']    = $lesson['course_id'];
        $this->data['lesson_id']    = $lesson_id;
        $this->data['subject_id']  = $lesson['subject_id'];
        $this->data['lesson_title'] = $lesson['title'];
        $this->data['page_title'] = 'Lesson Files';
        $this->data['page_name'] = 'Lesson_files/index';
        return view('Admin/index', $this->data);
    }
    
    public function topic($topic_id)
    {
        $this->data['list_items'] = $this->lesson_file_model->get(['topic_id' => $topic_id],null,['order'=>'asc'])->getResultArray();
        $lesson                     = $this->topic_model->get(['id' => $topic_id])->getRowArray();
        $this->data['course_id']    = $lesson['course_id'];
        $this->data['lesson_id']    = $lesson['lesson_id'];
        $this->data['topic_id']     = $topic_id;
        $this->data['subject_id']   = $lesson['subject_id'];
        $this->data['lesson_title'] = $lesson['title'];
        $this->data['page_title']   = 'Lesson Files';
        $this->data['page_name']    = 'Lesson_files/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add($id){
        $this->data['lesson_id'] = $id;
        echo view('Admin/Lesson_files/ajax_add', $this->data);
    }
    
    public function ajax_add_video($id,$topic=null){
        $this->data['lesson_id'] = $id;
        $this->data['topic_id'] = $topic;
        $this->data['languages'] = $this->languages_model->get()->getResultArray();

        echo view('Admin/Lesson_files/ajax_add_video', $this->data);
    }
    
    public function ajax_add_document($id,$topic=null){
        $this->data['lesson_id'] = $id;
        $this->data['topic_id'] = $topic;
        $this->data['languages'] = $this->languages_model->get()->getResultArray();

        echo view('Admin/Lesson_files/ajax_add_document', $this->data);
    }
    
    public function ajax_add_article($id,$topic=null){
        $this->data['lesson_id'] = $id;
        $this->data['topic_id'] = $topic;
        $this->data['languages'] = $this->languages_model->get()->getResultArray();

        echo view('Admin/Lesson_files/ajax_add_article', $this->data);
    }
    
    public function ajax_add_audio($id,$topic=null){
        $this->data['lesson_id'] = $id;
        $this->data['topic_id'] = $topic;
            $this->data['languages'] = $this->languages_model->get()->getResultArray();

        echo view('Admin/Lesson_files/ajax_add_audio', $this->data);
    }
    
    public function ajax_add_quiz($id,$topic=null){
        $this->data['lesson_id'] = $id;
        $this->data['topic_id'] = $topic;
        $this->data['languages'] = $this->languages_model->get()->getResultArray();

        echo view('Admin/Lesson_files/ajax_add_quiz', $this->data);
    }
    
    

    public function add()
    {
        $logger = service('logger');
        if($this->request->getMethod() === 'post')
        {
            $lesson = $this->request->getPost('lesson_id');
            $topic = $this->request->getPost('topic_id');

            $course = $this->lesson_model->get(['id'=>$lesson],['course_id'])->getRowArray();
            $logger->error('Database Error: ' . db_connect()->getLastQuery());

            $course_id = $course['course_id'];
            
    
            if ($this->request->getMethod() === 'post')
            {
                
                    
                    $languages = $this->request->getPost('language_id[]');
               
                            
                    $order = $this->lesson_file_model->get(['lesson_id' => $this->request->getPost('lesson_id')],[], ['order' => 'desc'], 1)->getRow()->order ?? 0;
                    
                    $data = [
                        'title' => $this->request->getPost('title'),
                        'lesson_id' => $this->request->getPost('lesson_id'),
                        'topic_id' => $this->request->getPost('topic_id'),
                        'summary' => $this->request->getPost('summary'),
                        'order'   => $order+1,
                        'created_at' => date('Y-m-d H:i:s'),
                        'created_by' => session()->get('user_id'),
                        'updated_at' => date('Y-m-d H:i:s'),
                    ];
                    
                    
                    if (isset($languages) && is_array($languages)) {
                        $data['languages'] = json_encode($languages);
                    }
                    
                    $lesson_type_array          = explode('-', $this->request->getPost('lesson_type'));
                    $lesson_provider            = $this->request->getPost('lesson_provider');
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
                        // $html5_url = get_vimeo_file_url($this->request->getPost('video_url'));
                        // if($html5_url['status'] == 'true'){
                        //     $data['html5_video_url']  = $html5_url['files'];
                        // }
                    }
                    
                    $data['is_practice']    = $this->request->getPost('is_practice') == 1 ? 1 : 0;
                    $data['free']           = $this->request->getPost('free') == 'on' ? 'on' : 'off';
    
                    
                    
                    $cat_id = $this->lesson_file_model->add($data);
                    if ($cat_id){
                        $this->lesson_file_model->edit(['master_lesson_file_id' => $cat_id], ['id' => $cat_id]);
                        if($lesson_type == "video")
                        {
                            if($lesson_provider == 'vimeo')
                            {
                                $vimeo_video_file = get_vimeo_file_url($data['video_url']);

                                log_message('error', 'vimeo_video_file: ' . json_encode($vimeo_video_file));
                                
                                $files      =   $vimeo_video_file['files'];
                                $downloads  =   $vimeo_video_file['downloads'];
                                
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
                                                'lesson_file_id' => $cat_id,
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
                        
                        }
                        $this->propagate_new_child_addition('lesson_file', $cat_id);
                        session()->setFlashdata('message_success', "Updated Successfully!");
                    }else{
                        session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                    }
               
            }
            // return redirect()->to(base_url('admin/lesson_files/index/'.$lesson));
            return redirect()->to($_SERVER['HTTP_REFERER']);
        }
        else
        {
            // return redirect()->to(base_url('admin/course/'));
            return redirect()->to($_SERVER['HTTP_REFERER']);
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
                $response['status'] = true;
                $response['url'] = base_url($attachment['file']);

            }
            else
            {
                $response['error'] = 'Failed to upload file.';
                $response['status'] = false;
            }

            
        } else {
            // Handle non-AJAX request
            $response['error'] = 'Invalid request method.';
            $response['message'] = 'Invalid request method.';
            $response['status'] = false;
        }

        // Return JSON response
        return $this->response->setJSON($response);
    }

    public function ajax_edit($id){
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->lesson_file_model->get(['id' => $id])->getRowArray();
        $this->data['languages'] = $this->languages_model->get()->getResultArray();

        echo view('Admin/Lesson_files/ajax_edit', $this->data);
    }
    
     public function ajax_view($id){
        $this->data['view_data'] = $this->lesson_file_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Lesson_files/ajax_view', $this->data);
    }

    public function edit($id){
        
        if ($this->request->getMethod() === 'post'){
            $lesson = $this->lesson_file_model->get(['id'=>$id],['lesson_id'])->getRowArray();
            $course = $this->lesson_model->get(['id'=>$lesson],['course_id'])->getRowArray();
            
            $languages = $this->request->getPost('language_id[]');

            
            $logger = service('logger');
            
            $course_id = $course['course_id'];
            $lesson_id = $lesson['lesson_id'];
        
            $data = [
                     'title' => $this->request->getPost('title'),
                    'lesson_id' => $lesson_id,
                    'summary' => $this->request->getPost('summary'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                if (isset($languages) && is_array($languages)) {
                        $data['languages'] = json_encode($languages);
                    }
                
                $lesson_type_array          = explode('-', $this->request->getPost('lesson_type'));
                $lesson_provider            = $this->request->getPost('lesson_provider');
                $lesson_type                = $lesson_type_array[0];
                $data['attachment_type']    = $lesson_type_array[1];
                $data['lesson_type']        = $lesson_type;
                
                if ($lesson_type_array[1] == 'pdf') {
                      $uploadedFileName = $this->request->getPost('uploadedFileName'); // Retrieve uploaded filename from hidden input
                      if(!empty($uploadedFileName))
                      {
                        $data['attachment'] = $uploadedFileName;
                      }
                } else if ($lesson_type_array[1] == 'audio') {
                    if ($this->request->getFile('audio_file') && $this->request->getFile('audio_file')->isValid()) {
                        $audio_file = $this->upload_file('lesson_files','audio_file');
                        if($audio_file){
                			$data['audio_file'] = $audio_file['file'];
                		}else{
                		    $data['audio_file'] = '';
                		}
                    }
                }else if($lesson_type_array[1] == 'quiz'){
                        
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
                
                if ($lesson_type == 'video') {
                    $lesson_provider = $this->request->getPost('lesson_provider');
                    if ($lesson_provider == 'youtube' || $lesson_provider == 'vimeo') {
                        $data['video_url']  = $this->request->getPost('video_url');
                        $duration_formatter = explode(':', $this->request->getPost('duration'));
                        $hour               = sprintf('%02d', $duration_formatter[0]);
                        $min                = sprintf('%02d', $duration_formatter[1]);
                        $sec                = sprintf('%02d', $duration_formatter[2]);
                        $data['duration']       = $hour . ':' . $min . ':' . $sec;
                        $data['lesson_provider']     = $lesson_provider;
                        $data['download_url']   = $this->request->getPost('download_url');
                    }
                    
                    $data['video_type']     = $this->request->getPost('video_type');
                    // $html5_url = get_vimeo_file_url($this->request->getPost('video_url'));
                    // if($html5_url['status'] == 'true'){
                    //     $data['html5_video_url']  = $html5_url['video_link'];
                    // }
                }
                $data['free']           = $this->request->getPost('free') == 'on' ? 'on' : 'off';

            $response = $this->lesson_file_model->edit($data, ['id' => $id]);
            // $logger->error('Database Error: ' . db_connect()->getLastQuery());
            if ($response){

                $lesson_file_id = $id;
                if($lesson_type == "video")
                {
                    if($lesson_provider == 'vimeo')
                    {
                        $remove_existing = $this->vimeo_videolinks_model->remove(['lesson_file_id' =>$lesson_file_id]);
                        // $logger = service('logger');
                        // $logger->error('Database Error: ' . db_connect()->getLastQuery());
    
                        $vimeo_video_file_url = get_vimeo_file_url($data['video_url']);
                                    
                        $files      =   $vimeo_video_file_url['files'];
                        $downloads  =   $vimeo_video_file_url['downloads'];
                                    
                        $files = array_reverse($files);
                        $downloads = array_reverse($downloads);
                                    
                                   
                        if(!empty($files))
                        {
                            // Map downloads by rendition for quick lookup
                            $downloadMap = [];
                            foreach ($downloads as $download) 
                            {
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
                                        
                                        
                            foreach ($files as $val)
                            {
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
                                
                }
                session()->setFlashdata('message_success', "Updated Successfully!");
                $this->propagate_lesson_file_update($id);
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            
            // return redirect()->to(base_url('admin/lesson_files/index/'.$lesson_id));
             return redirect()->to($_SERVER['HTTP_REFERER']);
        }
        else
        {
            // return redirect()->to(base_url('admin/course/'));
             return redirect()->to($_SERVER['HTTP_REFERER']);
        }
        
    }

  

    // public function delete($id){
    //     $lesson = $this->lesson_file_model->get(['id'=>$id],['lesson_id'])->getRowArray();
    //     $course = $this->lesson_model->get(['id'=>$lesson['lesson_id']],['course_id'])->getRowArray();
    //     $course_id = $course['course_id'];
        
    //     if ($id > 0){
    //         if ($this->lesson_file_model->remove(['id' => $id])){
    //             session()->setFlashdata('message_success', "Deleted Successfully!");
    //         }else{
    //             session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //         }
    //     }else{
    //         session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //     }
        
    //     // return redirect()->to(base_url('admin/lesson_files/index/'.$lesson['lesson_id']));
    //      return redirect()->to($_SERVER['HTTP_REFERER']);
    // }

    public function delete($id)
    {
        // Fetch lesson file and its related lesson
        $lesson_file = $this->lesson_file_model->get(['id' => $id])->getRowArray();
        if (!$lesson_file) {
            session()->setFlashdata('message_danger', "Invalid File ID!");
            return redirect()->to($_SERVER['HTTP_REFERER']);
        }

        $lesson = $this->lesson_model->get(['id' => $lesson_file['lesson_id']])->getRowArray();
        $course_id = $lesson['course_id'] ?? null;

        if ($id > 0) {
            //  Delete this lesson file and all its linked clones
            $this->deleteLessonFileGroup($id);

            session()->setFlashdata('message_success', "Lesson File(s) Deleted Successfully!");
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

        return redirect()->to($_SERVER['HTTP_REFERER']);
    }


    private function deleteLessonFileGroup($lesson_file_id)
    {
        // Fetch the target lesson file
        $orig = $this->lesson_file_model->get(['id' => $lesson_file_id])->getRowArray();
        if (!$orig) return;

        // Determine the master lesson file ID
        $group_master_id = $orig['master_lesson_file_id'] ?? $orig['id'];

        // Fetch all related files (both master + clones)
        $group_files = $this->lesson_file_model
            ->get([
                'OR' => [
                    'master_lesson_file_id' => $group_master_id,
                    'id' => $group_master_id
                ]
            ])
            ->getResultArray();

        foreach ($group_files as $file) {
            //  Delete related items (if any) like quizzes, vimeo links, etc.
            // $this->quiz_model->remove(['lesson_file_id' => $file['id']]);
            // $this->vimeo_videolinks_model->remove(['lesson_file_id' => $file['id']]);

            // Delete the lesson file itself
            $this->lesson_file_model->remove(['id' => $file['id']]);
        }
    }

        
    
    public function ajax_sort($lesson_id){
        $this->data['lesson_files'] = $this->lesson_file_model->get(['lesson_id' => $lesson_id],null,['order'=>'asc'])->getResultArray();
        $this->data['lesson_id'] =$lesson_id;
        $lesson                     = $this->lesson_model->get(['id' => $lesson_id])->getRowArray();
        $this->data['course_id']    = $lesson['course_id'];
        $this->data['subject_id']  = $lesson['subject_id'];
        echo view('Admin/Lesson_files/ajax_sort', $this->data);
    }
    
    public function updateOrder()
    {
        // $logger = service('logger');
        $lessonOrder = $this->request->getJSON(true)['lessonOrder'];
        foreach ($lessonOrder as $key => $lesson) {
            $data = ['order' => $key + 1];
            $this->lesson_file_model->edit($data, ['id' => $lesson]);
            // $logger->error('subject order Error: ' . db_connect()->getLastQuery());


        }
        session()->setFlashdata('message_success', "Order updated Successfully!");
        return json_encode(['data'=> 1]);
    }
    
    
    public function ajax_view_video($id){
        $this->data['view_data'] = $this->lesson_file_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Lesson_files/ajax_view_video', $this->data);
    }

    protected function propagate_new_child_addition(string $type, int $new_id)
    {
        if ($this->is_syncing) return;
        $this->is_syncing = true;

        switch ($type) {

            /*** ───────────────────────────── LESSON FILE ───────────────────────────── ***/
            case 'lesson_file':
                $orig = $this->lesson_file_model->get(['id' => $new_id])->getRowArray();
                if (!$orig) break;

                // --- STEP 1: Find the true master lesson ID ---
                $origLesson = $this->lesson_model
                    ->get(['id' => $orig['lesson_id']])
                    ->getRowArray();

                if (!$origLesson) break;

                // if lesson is a clone, use its master_lesson_id; else itself is master
                $group_master_id = !empty($origLesson['master_lesson_id'])
                    ? $origLesson['master_lesson_id']
                    : $origLesson['id'];

                // --- STEP 2: Get all lessons linked to this master group ---
                $group_lessons = $this->lesson_model
                    ->get(['master_lesson_id' => $group_master_id])
                    ->getResultArray();

                // Add master lesson itself if not in the list
                $has_master = array_filter($group_lessons, fn($l) => $l['id'] == $group_master_id);
                if (empty($has_master)) {
                    $master_lesson = $this->lesson_model->get(['id' => $group_master_id])->getRowArray();
                    if ($master_lesson) $group_lessons[] = $master_lesson;
                }

                // --- STEP 3: Clone lesson files to all linked lessons ---
                $processed = [];
                foreach ($group_lessons as $l) {
                    if (in_array($l['id'], $processed)) continue;
                    $processed[] = $l['id'];

                    // Skip where original was added
                    if ($l['id'] == $orig['lesson_id']) continue;

                    $clone = $orig;
                    unset($clone['id']);
                    $clone['lesson_id'] = $l['id'];
                    $clone['master_lesson_file_id'] = $orig['master_lesson_file_id'] ?? $new_id;
                    $clone['created_at'] = date('Y-m-d H:i:s');
                    $clone['updated_at'] = date('Y-m-d H:i:s');
                    $clone['created_by'] = get_user_id();

                    $clone_id = $this->lesson_file_model->add($clone);

                    // --- Vimeo sync (if applicable) ---
                    if ($clone_id && $orig['lesson_type'] == 'video' && $orig['lesson_provider'] == 'vimeo') {
                        $vimeoFiles = $this->vimeo_videolinks_model
                            ->get(['lesson_file_id' => $orig['id']])
                            ->getResultArray();

                        foreach ($vimeoFiles as $vf) {
                            unset($vf['id']);
                            $vf['lesson_file_id'] = $clone_id;
                            $vf['created_at'] = date('Y-m-d H:i:s');
                            $vf['created_by'] = get_user_id();
                            $this->vimeo_videolinks_model->add($vf);
                        }
                    }
                }

                break;
        }

        $this->is_syncing = false;
    }




    protected function propagate_lesson_file_update(int $file_id, array $updated_fields = [])
    {
        if ($this->is_syncing) return;
        $this->is_syncing = true;

        // 1️⃣ Get the original lesson file
        $orig = $this->lesson_file_model->get(['id' => $file_id])->getRowArray();
        if (!$orig) { 
            $this->is_syncing = false; 
            return; 
        }

        // 2️⃣ Determine master group (original + clones)
        $group_master_id = $orig['master_lesson_file_id'] ?? $orig['id'];

        $group_files = $this->lesson_file_model
            ->get(['master_lesson_file_id' => $group_master_id])
            ->getResultArray();

        // Also include the master if current file is a clone
        if ($group_master_id != $file_id) {
            $master_file = $this->lesson_file_model->get(['id' => $group_master_id])->getRowArray();
            if ($master_file) $group_files[] = $master_file;
        }

        // 3️⃣ Build fields to propagate
        if (empty($updated_fields)) {
            $updated_fields = $orig;
            unset(
                $updated_fields['id'],
                $updated_fields['lesson_id'], // keep independent lesson link
                $updated_fields['order'], // independent ordering
                $updated_fields['free'], // independent free status
                $updated_fields['created_by'],
                $updated_fields['created_at'],
                $updated_fields['master_lesson_file_id'], // linkage must remain
                $updated_fields['updated_at']
            );
        }

        // 4️⃣ Propagate update to all clones and/or master
        foreach ($group_files as $file) {
            if ($file['id'] == $file_id) continue;

            $to_update = $updated_fields;
            $to_update['updated_at'] = date('Y-m-d H:i:s');

            $this->lesson_file_model->edit($to_update, ['id' => $file['id']]);

            // Optional: handle special cases like Vimeo sync
            if (isset($to_update['video_url']) && $orig['lesson_provider'] == 'vimeo') {
                $this->sync_vimeo_links($file['id'], $to_update['video_url']);
            }
        }

        $this->is_syncing = false;
    }

    protected function sync_vimeo_links(int $lesson_file_id, string $video_url)
    {
        $this->vimeo_videolinks_model->remove(['lesson_file_id' => $lesson_file_id]);

        $vimeo_video_file_url = get_vimeo_file_url($video_url);
        if (empty($vimeo_video_file_url['files'])) return;

        $files = array_reverse($vimeo_video_file_url['files']);
        $downloads = array_reverse($vimeo_video_file_url['downloads']);
        $downloadMap = [];
        foreach ($downloads as $download) {
            $downloadMap[$download['rendition']] = $download['link'];
        }
        $downloadMap['adaptive'] = '';

        foreach ($files as &$file) {
            $file['download_link'] = $downloadMap[$file['rendition']] ?? null;
        }

        foreach ($files as $val) {
            $vimeo_data = [
                'lesson_file_id' => $lesson_file_id,
                'quality' => $val['quality'] ?? null,
                'rendition' => $val['rendition'] ?? null,
                'height' => $val['height'] ?? null,
                'width' => $val['width'] ?? null,
                'type' => $val['type'] ?? null,
                'link' => $val['link'] ?? null,
                'fps' => $val['fps'] ?? null,
                'size' => $val['size'] ?? null,
                'public_name' => $val['public_name'] ?? null,
                'size_short' => $val['size_short'] ?? null,
                'download_link' => $val['download_link'] ?? null,
                'created_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s')
            ];
            $this->vimeo_videolinks_model->add($vimeo_data);
        }
    }



}


