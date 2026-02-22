<?php
namespace App\Controllers\Admin;
use App\Models\Events_model;
use App\Models\Users_model;

class Events extends AppBaseController
{
    public function __construct()
    {
        parent::__construct();
        $this->events_model = new Events_model();
        $this->users_model = new Users_model();
    }

    public function index(){
        $this->data['list_items']   = $this->events_model->get()->getResultArray();
        $this->data['page_title']   = 'Events';
        $this->data['page_name']    = 'Events/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add()
    {
        $this->data['instructors'] =  $this->users_model->get(['role_id'=>3])->getResultArray();
        echo view('Admin/Events/ajax_add', $this->data);
    }

    public function add(){
    
        $objectives = $this->request->getPost('objectives');
        $objectives_json = json_encode($objectives);

        $data = [
            
            'title'         => $this->request->getPost('title'),
            'num_objectives'=> $this->request->getPost('num_objectives'),
            'instructor_id' => $this->request->getPost('instructor_id'),
            'description'   => $this->request->getPost('description'),
            'event_date'   =>  $this->request->getPost('event_date'),
            'from_time'     => $this->request->getPost('from_time'),
            'to_time'       => $this->request->getPost('to_time'),
            'duration'      => $this->request->getPost('duration'),
            'is_recording_available'       =>  ($this->request->getPost('is_recording_available') == 1) ? 1 : 0,
            'objectives'    => $objectives_json,
            'created_at'    => date('Y-m-d H:i:s'),
            'created_by'    => get_user_id(),
        ];
        
        $image = $this->upload_file('event','image');
        if($image){
			$data['image'] = $image['file'];
		}else{
		    $data['image'] = '';
		}

        $this->events_model->add($data);

        return redirect()->to(base_url('admin/events/index'));
    }

    public function ajax_edit($id){
        $this->data['instructors'] =  $this->users_model->get(['role_id'=>3])->getResultArray();
        $this->data['edit_data'] = $this->events_model->get(['id' => $id])->getRowArray();

        echo view('Admin/Events/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post')
        {
            $objectives = $this->request->getPost('objectives');
            $objectives_json = json_encode($objectives);

            $data = [
                'title'         => $this->request->getPost('title'),
                'num_objectives'=> $this->request->getPost('num_objectives'),
                'instructor_id' => $this->request->getPost('instructor_id'),
                'description'   => $this->request->getPost('description'),
                'event_date'   =>  $this->request->getPost('event_date'),
                'from_time'     => $this->request->getPost('from_time'),
                'to_time'       => $this->request->getPost('to_time'),
                 'duration'      => $this->request->getPost('duration'),
                'is_recording_available'       =>  ($this->request->getPost('is_recording_available') == 1) ? 1 : 0,
                'objectives'    => $objectives_json,
                'updated_by'    => get_user_id(),
                'updated_at'    => date('Y-m-d H:i:s'),
            ];
            $response = $this->events_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Designation Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }
        return redirect()->to(base_url('admin/events/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->events_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Designation/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            if ($this->events_model->remove(['id' => $id])){
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
