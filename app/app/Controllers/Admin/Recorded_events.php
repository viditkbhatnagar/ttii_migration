<?php
namespace App\Controllers\Admin;
use App\Models\Events_model;
use App\Models\Category_model;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Recorded_events_model;

class Recorded_events extends AppBaseController
{
    public function __construct()
    {
        parent::__construct();
        $this->events_model = new Events_model();
        $this->category_model = new Category_model();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->recorded_events_model = new Recorded_events_model();
    }



    
    public function index($id)
    {
        $this->data['list_items']   = $this->recorded_events_model->get(['event_id' =>$id])->getResultArray();
        $this->data['event'] = $this->events_model->get(['id' => $id])->getRowArray();

        $this->data['page_title']   = 'Recordings';
        $this->data['page_name']    = 'Recorded_events/index';
        return view('Admin/index', $this->data);
    }
    
    
    public function ajax_add($id){
        $this->data['event_id']     = $id;
        echo view('Admin/Recorded_events/ajax_add', $this->data);
    }
    
    
    public function add()
    {
        if($this->request->getMethod() === 'post')
        {
    
            if ($this->request->getMethod() === 'post'){
                
                $event_id =$this->request->getPost('event_id');

                    $data = [
                        'title' => $this->request->getPost('title'),
                        'event_id' => $event_id,
                        'summary' => $this->request->getPost('summary'),
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s'),
                    ];
                    
                    
                            $data['video_url']  = $this->request->getPost('video_url');
                            $duration_formatter = explode(':', $this->request->getPost('duration'));
                            $hour               = sprintf('%02d', $duration_formatter[0]);
                            $min                = sprintf('%02d', $duration_formatter[1]);
                            $sec                = sprintf('%02d', $duration_formatter[2]);
                            $data['duration']       = $hour . ':' . $min . ':' . $sec;
                            $data['download_url']   = $this->request->getPost('download_url');
                            // $data['attachment'] = $attachment['file'];
                       
                       

    
                    
                    
                    $cat_id = $this->recorded_events_model->add($data);
                    if ($cat_id){
                        session()->setFlashdata('message_success', "Recording Added Successfully!");
                    }else{
                        session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                    }
                return redirect()->to(base_url('admin/recorded_events/index/'.$event_id));
            }
            else
            {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                return redirect()->to(base_url('admin/events/'));
            }
            
        }
        else
        {
            return redirect()->to(base_url('admin/events/'));
        }
    }
    
     public function delete($id){
        if ($id > 0){
            if ($this->recorded_events_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/events/index'));
    }
    
}
