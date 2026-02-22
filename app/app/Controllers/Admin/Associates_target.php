<?php

namespace App\Controllers\Admin;
use App\Models\Users_model;
use App\Models\Associates_target_model;
//use App\Models\Students_model;

class Associates_target extends AppBaseController
{
    private $users_model;
    private $associates_target_model;
    
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        $this->associates_target_model = new Associates_target_model();
        //$this->students_model = new Students_model();
    }

    public function index(){
        $search_key = $this->request->getGet('search_key');
        $type = $this->request->getGet('type');
        $state = $this->request->getGet('state');
        
        $where = [];
        $where['users.role_id'] = 10;
        $this->data['active_associates'] = $this->users_model->get(['role_id' => '10','drop_out_status' => 1])->getNumRows();
        if (isset($search_key) && $search_key) {
            $where = [
                'users.role_id' => 10,
                'OR' => [
                    'users.name LIKE' => "%$search_key%",
                    'users.phone LIKE' => "%$search_key%",
                    'users.email LIKE' => "%$search_key%"
                ]
            ];
        }
        if(isset($type) && $type){
            $where['associates_target.type'] = $type;
        }
        
        if (isset($state)) {
            if($state == 'added') {
                $where['associates_target.associate_id !='] = null; 
            } elseif($state == 'not_added') {
                $where['associates_target.associate_id'] = null; 
            }
        }
        // $this->data['list_items'] = $this->users_model->get($where)->getResultArray();
        $this->data['list_items'] = $this->associates_target_model->get_join(
            [
                ['users', 'associates_target.associate_id = users.id']
            ],
            $where,
            ['users.id','users.name', 'associates_target.*']
        )->getResultArray();
        
        foreach ($this->data['list_items'] as $key => $associate) {
            
            $targetValue = $associate['value'];
        
            if ($associate['type'] == 1) {
                $where = [
                    'enrol.pipeline_user' => $associate['id'],
                    'enrol.enrollment_date >=' => $associate['from_date'],
                    'enrol.enrollment_date <=' => $associate['to_date']
                ];
        
                $achievedPoints = $this->users_model->get_join(
                    [['enrol', 'enrol.user_id = users.id'],
                    ['course', 'course.id = enrol.course_id']
                    ],
                    $where,
                    ['course.point']
                )->getResultArray(); 

                //log_message('error',print_r($achievedPoints,true));
                $totalAchievedPoints = array_sum(array_column($achievedPoints, 'point'));

                //log_message('error', $totalAchievedPoints);
        
                $this->data['list_items'][$key]['achivedPoint'] = $totalAchievedPoints;
        
                $performance = ($targetValue > 0) ? ($totalAchievedPoints / $targetValue) * 100 : 0;
        
                $this->data['list_items'][$key]['performance'] = round($performance, 2) . '%';
        
            } else if ($associate['type'] == 2) {
                $where = [
                    'enrol.pipeline_user' => $associate['id'],
                    'enrollment_date >=' => $associate['from_date'],
                    'enrollment_date <=' => $associate['to_date']
                ];
        
                $achievedCount = $this->users_model->get_join(
                    [['enrol','enrol.user_id = users.id']],$where)->getNumRows();
        
                $this->data['list_items'][$key]['achivedCount'] = $achievedCount;
        
                $performance = ($targetValue > 0) ? ($achievedCount / $targetValue) * 100 : 0;
        
                $this->data['list_items'][$key]['performance'] = round($performance, 2) . '%';
            }
        }
        
        // echo"<pre>";print_r($this->data['list_items']);die();
        $this->data['page_title'] = 'Associate Target';
        $this->data['page_name'] = 'Associates_target/index';
        return view('Admin/index', $this->data);
    }
    
    public function view($id){
        
       $this->data['view_data'] = $this->counsellor_target_model->get_join(
            [
                ['users', 'users.id = counsellor_target.counsellor_id'] 
            ],
            ['counsellor_target.counsellor_target_id' => $id],
            ['counsellor_target.*','users.name as counsellor_name']
        )->getRowArray();
        echo view('Admin/Associates_target/ajax_view', $this->data);
    }


    public function add() {
        if ($this->request->getMethod() === 'post') {
            $associate_id = $this->request->getPost('associate_id');
            $type = $this->request->getPost('type');
            $from_date = $this->request->getPost('from_date');
            $to_date = $this->request->getPost('to_date');
        
            // Check if there is an existing record that conflicts with the new date range
            $where = [
                'associate_id' => $associate_id,
                'type' => $type,
                'OR' => [
                    'from_date <=' => $to_date,
                    'to_date >=' => $from_date
                ]
            ];
        
            $existing = $this->associates_target_model->get($where)->getRow();
        
            if ($existing) {
                session()->setFlashdata('message_danger', "Date range conflicts with an existing record for this associate and type.");
                return redirect()->to(base_url('admin/associates_target/index'));
            }
        
            // If no conflict, proceed with adding the new record
            $data = [
                'type'          => $type,
                'from_date'     => $from_date,
                'to_date'       => $to_date,
                'value'         => $this->request->getPost('value'),
                'associate_id'  => $associate_id,
                'created_at'    => date('Y-m-d H:i:s'),
                'created_by'    => get_user_id()
            ];
        
            $response = $this->associates_target_model->add($data);
        
            if ($response) {
                session()->setFlashdata('message_success', "Associate Target Added Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        
            return redirect()->to(base_url('admin/associates_target/index'));
        }
        else {
                    $this->data['associates'] = $this->users_model->get(['role_id' => 10], ['id', 'name'])->getResultArray();
                    echo view('Admin/Associates_target/ajax_add', $this->data);
                }
        
    }

    public function edit($associate_target_id){
        if ($this->request->getMethod() === 'post'){
            
            $data = [
                'type'                  => $this->request->getPost('type'),
                'from_date'             => $this->request->getPost('from_date'),
                'to_date'               => $this->request->getPost('to_date'),
                'value'               => $this->request->getPost('value'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
             
            $response = $this->associates_target_model->edit($data, ['associate_target_id' => $associate_target_id]);
            
            if ($response){
                session()->setFlashdata('message_success', "Associate Target Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
            return redirect()->to(base_url('admin/associates_target/index'));
        } else {
            $this->data['edit_data'] = $this->associates_target_model->get(['associate_target_id' => $associate_target_id])->getRowArray();
            echo view('Admin/Associates_target/ajax_edit', $this->data);
        }
        
    }

    public function delete($id){
        if ($id > 0){
            if ($this->associates_target_model->remove(['associate_target_id' => $id])){
                session()->setFlashdata('message_success', "Associate Target Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/associates_target/index'));
    }
    

}
