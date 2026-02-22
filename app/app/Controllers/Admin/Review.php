<?php
namespace App\Controllers\Admin;
use App\Models\Users_model;
use App\Models\Course_model;

use App\Models\Review_model;


class Review extends AppBaseController
{
    
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        $this->course_model = new Course_model();
        $this->review_model = new Review_model();

    }

    public function index(){
        
        $this->data['list_items'] = $this->review_model->get_join(
                                    [
                                    	['users', 'users.id = review.user_id'],
                                    	['course', 'course.id = review.course_id'],
                                    ],
                                    [],
                                    [' review.*', 'users.name as name','course.title AS course'] 
                                    )->getResultArray();
        
        // $this->review_model->get([],[],['id' =>'desc'])->getResultArray();
        
        $this->data['page_title'] = 'Review';
        $this->data['page_name'] = 'Review/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['users'] = $this->users_model->get(['role_id'=>2])->getResultArray();


        echo view('Admin/Review/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
    
                $data = [
                    'user_id' => $this->request->getPost('user_id'),
                    'course_id' => $this->request->getPost('course_id'),
                    'review' => $this->request->getPost('review'),
                    'rating' => $this->request->getPost('rating'),

                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                $instructor = $this->review_model->add($data);
                if ($instructor){
                    session()->setFlashdata('message_success', "Review Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
     
        }
        
        return redirect()->to(base_url('admin/review/index'));
    }

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->review_model->get(['id' => $id])->getRowArray();
        
          $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['users'] = $this->users_model->get(['role_id'=>2])->getResultArray();




        echo view('Admin/Review/ajax_edit', $this->data);
    }

    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            
            
                 $data = [
                   'user_id' => $this->request->getPost('user_id'),
                    'course_id' => $this->request->getPost('course_id'),
                    'review' => $this->request->getPost('review'),
                    'rating' => $this->request->getPost('rating'),

                    'updated_by' => get_user_id(),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
            
			
                $instructor =$this->review_model->edit($data, ['id' => $id]);
                if ($instructor){
                    session()->setFlashdata('message_success', "Review Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
                
         
        }
        return redirect()->to(base_url('admin/review/index'));
    }

 

    public function delete($id){
        if ($id > 0)
        {
            if ($this->review_model->remove(['id' => $id]))
            {
                session()->setFlashdata('message_success', "Review Deleted Successfully!");
            }
            else
            {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/review/index'));
    }


  
}
