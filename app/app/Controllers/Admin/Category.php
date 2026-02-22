<?php
namespace App\Controllers\Admin;
use App\Models\Course_model;
use App\Models\Category_model;

class Category extends AppBaseController
{
    private $category_model;
    public function __construct()
    {
        parent::__construct();
        $this->course_model = new Course_model();
        $this->category_model = new Category_model();
    }

    public function index(){
        
        $categorys = $this->category_model->get(['parent'=>0])->getResultArray();
        
        if(!empty($categorys))
        {
            foreach($categorys as $k => $val)
            {
                $categorys[$k]['sub_cats'] = $this->category_model->get(['parent'=> $val['id']])->getResultArray();
            }
        }
        $this->data['list_items'] = $categorys;
        
        
        $this->data['page_title'] = 'Category';
        $this->data['page_name'] = 'Category/index';
        return view('Admin/index', $this->data);
    }
    
    public function ajax_add(){
        $this->data['categories'] = $this->category_model->get(['parent'=>0])->getResultArray();
        echo view('Admin/Category/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            
            $code = $this->request->getPost('code');
            $name = $this->request->getPost('name');
            
            $check_code_duplication = $this->category_model->get(['code' => $code])->getNumRows();
            $check_name_duplication = $this->category_model->get(['name' => $name])->getNumRows();
            
            if($check_code_duplication == 0 && $check_code_duplication == 0) 
            {
                $data = [
                    'code' => $this->request->getPost('code'),
                    'name' => $this->request->getPost('name'),
                    'year' => $this->request->getPost('year'),
                    'font_awesome_class' => $this->request->getPost('icon'),
                    // 'parent' => $this->request->getPost('parent'),
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                  $image = $this->upload_file('category','category_thumbnail');
                    if($image && valid_file($image['file'])){
        				$data['thumbnail'] = $image['file'];
        			}
    			
                  $image2 = $this->upload_file('category','category_icon');
                    if($image2 && valid_file($image2['file'])){
        				$data['category_icon'] = $image2['file'];
        			}
    			
    			
    			
                $cat_id = $this->category_model->add($data);
                if ($cat_id){
                    session()->setFlashdata('message_success', "Category Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }
            else
            {
                session()->setFlashdata('message_danger', "Category already exists"); 
            }
        }
        return redirect()->to(base_url('admin/category/index'));
    }

    public function ajax_edit($id){
        $this->data['categories'] = $this->category_model->get(['parent'=>0])->getResultArray();
        $this->data['edit_data'] = $this->category_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Category/ajax_edit', $this->data);
    }

    public function edit($id){
        
        $logger = service('logger');
        if ($this->request->getMethod() === 'post'){
            
            $code = $this->request->getPost('code');
            $name = $this->request->getPost('name');
            
            $check_code_duplication = $this->category_model->get(['code' => $code,'id !=' => $id])->getNumRows();
            $check_name_duplication = $this->category_model->get(['name' => $name,'id !=' => $id])->getNumRows();
            $logger->error('Database Error: ' . db_connect()->getLastQuery());
       
            
            if($check_code_duplication == 0 && $check_name_duplication == 0) 
            {
                $data = [
                    'code' => $this->request->getPost('code'),
                    'name' => $this->request->getPost('name'),
                    'year' => $this->request->getPost('year'),
                    'font_awesome_class' => $this->request->getPost('icon'),

                    // 'parent' => $this->request->getPost('parent'),
                    'updated_by' => get_user_id(),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                 $image = $this->upload_file('category','category_thumbnail');
                    if($image && valid_file($image['file'])){
        				$data['thumbnail'] = $image['file'];
        			}
    			$image2 = $this->upload_file('category','category_icon');
                    if($image2 && valid_file($image2['file'])){
        				$data['category_icon'] = $image2['file'];
        			}
    // 			echo "<pre>";
    // 			print_r($data); exit();
                $response = $this->category_model->edit($data, ['id' => $id]);
                if ($response){
                    session()->setFlashdata('message_success', "Category Updated Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }
            else
            {
                session()->setFlashdata('message_danger', "Category already exists"); 
            }
        }
        return redirect()->to(base_url('admin/category/index'));
    }

    public function ajax_view($id){
        $this->data['view_data'] = $this->category_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Category/ajax_view', $this->data);
    }

    public function delete($id){
        if($id > 0){
            $course_data = $this->course_model->get(['category_id' => $id])->getNumRows();
            if($course_data==0){
                if($this->category_model->remove(['id' => $id])){
                    session()->setFlashdata('message_success', "Category Deleted Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "You can\'t Delete This Category!");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/category/index'));
    }
    
}
