<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Users_model;
use App\Models\Notification_model;
use App\Models\Category_model;

class Notification extends AppBaseController
{
    private $batch_model;
    private $course_model;
    private $users_model;


    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->users_model = new Users_model();
        $this->notification_model = new Notification_model();
        $this->category_model = new Category_model();
    }

    public function index()
    {
        
        $this->data['notifications'] = $this->notification_model->get([], [], ['id', 'DESC'])->getResultArray();
        
        // echo "<pre>"; print_r($this->data['list_item']); exit;
        $this->data['page_name'] = 'Notification/index';
        $this->data['page_title'] = 'Notifications';
        return view('Admin/index', $this->data);
    }
    
    public function mark_as_read()
    {
        $this->notification_model->markAllAsRead();
        echo json_encode(['status' => 'success']);
    }
    
    public function clear_all()
    {
        $this->notification_model->clearAll();
        echo json_encode(['status' => 'success']);
    }

    // public function index(){
        
    //     $this->data['list_items'] = $this->notification_model->get()->getResultArray();
    //     $this->data['page_title'] = 'Notification';
    //     $this->data['page_name'] = 'Notification/index';
    //     return view('Admin/index', $this->data);
    // }
    
    // public function ajax_add(){
    //     $this->data['courses'] = $this->course_model->get()->getResultArray();
    //     echo view('Admin/Notification/ajax_add', $this->data);
    // }

    // public function add(){
    //     if ($this->request->getMethod() === 'post'){
    //         $data = [
    //             'title'             => $this->request->getPost('title'),
    //             'description'       => $this->request->getPost('description'),
    //             // 'category_id'       => $this->request->getPost('category_id'),
    //             'course_id'         => $this->request->getPost('course_id'),
    //             'external_link'     => $this->request->getPost('external_link'),
    //             'created_by'        => get_user_id(),
    //             'created_at'        => date('Y-m-d H:i:s'),
    //         ];
            
            
    //         $where = [];
    //         if($this->request->getPost('course_id') > 0){
    //            $where['course_id'] = $this->request->getPost('course_id');
    //         }
    //         $users = $this->users_model->get($where, NULL, null, NULL, 'notification_token')->getResultArray();
    //         $token = array_column($users, 'notification_token');
            
    //         if($this->request->getPost('push')==1){
    //             $token = array_filter($token, function ($value) {
    //                 return !is_null($value) && $value !== '';
    //             });
    //             $token = array_chunk($token, 800);
    
    //             foreach ($token as $tk){
    //                 sendNotification($this->request->getPost('title'),$this->request->getPost('description'), $tk);
    //             }
    //         }
            
    //         if($this->request->getPost('in_app')){
    //             $inserted_id = $this->notification_model->add($data);
    //             if($inserted_id){
    //                 session()->setFlashdata('message_success', "Added Successfully!");
    //             }else{
    //                 session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //             }
    //         }
            
    //     }
    //     return redirect()->to(base_url('admin/notification/index'));
    // }



    // public function ajax_view($id){
    //     $this->data['course'] = $this->course_model->get_array_column([], 'id', 'title');
    //     $this->data['view_data'] = $this->feed_category_model->get(['id' => $id])->getRowArray();
    //     echo view('Admin/Batch/ajax_view', $this->data);
    // }

    // public function delete($id){
    //     if ($id > 0){
    //         if ($this->notification_model->remove(['id' => $id])){
    //             session()->setFlashdata('message_success', "Deleted Successfully!");
    //         }else{
    //             session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //         }
    //     }else{
    //         session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //     }
    //     return redirect()->to(base_url('admin/notification/index'));
    // }
    
    
    

}
