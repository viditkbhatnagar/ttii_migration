<?php
namespace App\Controllers\Admin;
use App\Models\Books_model;
use App\Models\Books_chapters_model;


class Books extends AppBaseController
{
    private $books_model; 
    
    public function __construct()
    {
        parent::__construct();
        // $this->users_model = new Users_model();
        $this->books_chapters_model = new Books_chapters_model();
        // $this->instructor_enrol_model = new Instructor_enrol_model();
        $this->books_model = new Books_model();
        // $this->course_model = new Course_model();
        // $this->country_model = new Country_model();

    }

    public function index(){

        // $this->data['list_items'] = $this->books_model->get([], ['title'])->getResultArray();
        $this->data['list_items'] = $this->books_model->get([],['book_id','title','author','description','cover_image','status'])->getResultArray();
        $this->data['page_title'] = 'Books';
        $this->data['page_name'] = 'Books/index';
        return view('Admin/index', $this->data);
    }
    
    public function chapters_ajax_add($book_id){
        $this->data['book_id']=$book_id;
        echo view('Admin/Books/chapters_ajax_add', $this->data);
    }
    public function chapters_add(){
        if ($this->request->getMethod() === 'post'){
            $book_id = $this->request->getPost('book_id');
            $chapter = $this->request->getPost('chapter');
            $description = $this->request->getPost('description');
           
                $data = [
                    'book_id'     => $book_id,
                    'chapter'       => $chapter,
                    'description' => $description,
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
			
                $chapters = $this->books_chapters_model->add($data);
                if ($chapters){
                    session()->setFlashdata('message_success', "Chapter Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            
        }
        
        return redirect()->to(base_url('admin/Books/chapters/'.$book_id));
        // return redirect()->to(base_url('admin/Books/chapters/$book_id'));
    }
    public function ajax_add(){

        echo view('Admin/Books/ajax_add'); //view('Admin/Books/ajax_add', $this->data)
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            
            $title = $this->request->getPost('title');
            $author = $this->request->getPost('author');
            $description = $this->request->getPost('description');
            $status = $this->request->getPost('status');
            $check_book_duplication = $this->books_model->get(['title' => $title ,'author' => $author])->getNumRows();
           
                $data = [
                    'title'       => $title,
                    'author'      => $author,
                    'description' => $description,
                    'status'      => $status,
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
                
                $image = $this->upload_file('books','cover_image');
                if($image && valid_file($image['file'])){
    				$data['cover_image'] = $image['file'];
    			}
    	
			
                $book = $this->books_model->add($data);
                if ($book){
                    session()->setFlashdata('message_success', "Book Added Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            
        }
        
        return redirect()->to(base_url('admin/Books/index'));
    }
    public function ajax_edit_chapter($id){
        $this->data['edit_data'] = $this->books_chapters_model->get(['book_id' => $id])->getRowArray();
        // echo $this.data;die();
        echo view('Admin/Books/ajax_edit_chapter', $this->data);
        // echo $id."hi";
    }

    public function edit_chapter($id){
    if ($this->request->getMethod() === 'post'){
        
        $chapter = $this->request->getPost('chapter');
        $description = $this->request->getPost('description');
        $data = [
                    'chapter'      => $chapter,
                    'description'      => $description,
                    'updated_by' => get_user_id(),
                    'updated_at' => date('Y-m-d H:i:s'),
        ];
        // Update the book
        $chapter = $this->books_chapters_model->edit($data, ['book_id' => $id]);
        if ($chapter){
            session()->setFlashdata('message_success', "Chapter Updated Successfully!");
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

    } else {
        session()->setFlashdata('message_danger', "Chapter already exists"); 
    }
    
    return redirect()->to(base_url('admin/books/chapters/'.$book_id));
}
    public function ajax_edit($id){
        $this->data['edit_data'] = $this->books_model->get(['book_id' => $id])->getRowArray();

        echo view('Admin/Books/ajax_edit', $this->data);
    }

    public function edit($id){
    if ($this->request->getMethod() === 'post'){
        
        $title = $this->request->getPost('title');
        $author = $this->request->getPost('author');
        $description = $this->request->getPost('description');
        $status = $this->request->getPost('status');
        $data = [
                    'title'      => $title,
                    'author'      => $author,
                    'description'      => $description,
                    'status'      => $status,
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
        ];

        $image = $this->upload_file('books','cover_image');
        if ($image && valid_file($image['file'])){
            $data['cover_image'] = $image['file'];
        }
        
        // Update the book
        $book = $this->books_model->edit($data, ['book_id' => $id]);
        if ($book){
            session()->setFlashdata('message_success', "Book Updated Successfully!");
        } else {
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }

    }
    
    return redirect()->to(base_url('admin/books/index'));
}



    public function ajax_view($id){
        $this->data['view_data'] = $this->books_model->get(['book_id' => $id])->getRowArray();
        echo view('Admin/Books/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
                if ($this->books_model->remove(['book_id' => $id])){
                    session()->setFlashdata('message_success', "Book Deleted Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/books/index'));
    }
    
    
    
    public function chapters($id) {
    // Fetching chapter details from the database
    $chapters = $this->books_chapters_model->get(['book_id' => $id])->getResultArray();
    // echo"<pre>";print_r($chapters);die();
    // Checking if data is being fetched
    // if (empty($chapters)) {
    //     echo "No chapters found for this book.";
    //     die(); // Stop execution to see the output
    // }

    // Passing the data to the view
    $this->data['chapters'] = $chapters;
    $this->data['book_id'] = $id;
    $this->data['page_title'] = 'Included Chapters';
    $this->data['page_name'] = 'Books/chapters';

    // Render the view
    return view('Admin/index', $this->data);
}

    
     public function ajax_enrol($id)
     {
        $this->data['instructor'] = $id;
        $this->data['course'] = $this->course_model->get()->getResultArray();
        echo view('Admin/Instructor/ajax_enrol', $this->data);
    }
    
    public function enrol_course(){
        if ($this->request->getMethod() === 'post'){
            $ins = $this->request->getPost('instructor_id');
            $data = [
                'course_id'=> $this->request->getPost('course_id'),
                'instructor_id'=> $this->request->getPost('instructor_id'),
                'created_by' => get_user_id(),
                'updated_by' => get_user_id(),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            
            if($this->instructor_enrol_model->get(['course_id' =>  $this->request->getPost('course_id'), 'instructor_id'=> $this->request->getPost('instructor_id')])->getNumRows()==0){
                $enrol = $this->instructor_enrol_model->add($data);
                if ($enrol){
                    session()->setFlashdata('message_success', "Enrolled Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "Already Enrolled to this course");
            }
        }
        return redirect()->to(base_url('admin/instructor/course/'.$ins));
    }
    
    
     public function delete_chapter($id){
        if ($id > 0){
            if ($this->books_chapters_model->remove(['book_id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/books/chapters/'.$id));
    }
    
    
    public function students($id){
        
        $this->data['list_items'] = $this->instructor_students_model->get_join(
                    [
                        ['users', 'users.id = instructor_students.student_id'],
                        ['course', 'course.id = instructor_students.course_id'],
                        
                    ],['instructor_id' => $id],['instructor_students.id','users.name','course.title','instructor_students.created_at']
                    )->getResultArray();
        
        
        // $this->instructor_students_model->get(['instructor_id' => $id])->getResultArray();
        
        $this->data['instructor'] = $id;
        
        $user = $this->users_model->get(['role_id'=>2])->getResultArray();
        $this->data['students'] = array_column($user, 'name', 'book_id');
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'book_id');
        
        
        $this->data['page_title'] = 'Students';
        $this->data['page_name'] = 'Instructor/students';
        return view('Admin/index', $this->data);
    }
    
    
     public function ajax_assign($id)
     {
        $this->data['instructor'] = $id;

        $this->data['courses'] = $this->instructor_enrol_model->get_join(
                                    [
                                        ['course', 'course.id = instructor_enrol.course_id'],
                                    ],['instructor_enrol.instructor_id' => $id],['course.id','course.title']
                                    )->getResultArray();
        
         $this->data['list_items'] = $this->instructor_enrol_model->get(['instructor_id' => $id])->getResultArray();

    
        $user = $this->users_model->get(['role_id'=>3])->getResultArray();
        $this->data['user'] = array_column($user, 'name', 'book_id');
        
        $course = $this->course_model->get()->getResultArray();
        $this->data['course'] = array_column($course, 'title', 'book_id');
        
        $this->data['students'] = $this->users_model->get(['role_id'=>2])->getResultArray();

        echo view('Admin/books/ajax_assign', $this->data);
    }
    
    
    //  public function assign_student(){
    //     if ($this->request->getMethod() === 'post'){
            
    //         $ins = $this->request->getPost('instructor_id');
    //         $data = [
    //             'course_id'=> $this->request->getPost('course_id'),
    //             'instructor_id'=> $this->request->getPost('instructor_id'),
    //             'student_id'=> $this->request->getPost('student_id'),
    //             'created_by' => get_user_id(),
    //             'updated_by' => get_user_id(),
    //             'created_at' => date('Y-m-d H:i:s'),
    //             'updated_at' => date('Y-m-d H:i:s'),
    //         ];
    //         $enrol = $this->instructor_students_model->add($data);
    //         if ($enrol){
    //             session()->setFlashdata('message_success', "Enrolled Successfully!");
    //         }else{
    //             session()->setFlashdata('message_danger', "Something went wrong! Try Again");
    //         }
    //     }
    //     return redirect()->to(base_url('admin/instructor/students/'.$ins));
    // }
    
    
      public function assign_delete($id){
        if ($id > 0){
            if ($this->books_chapters_model->remove(['book_id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/books/index'));
    }
    
    
    public function change_device($id){
        if ($id > 0){
            $data['device_id'] = null;
            $response = $this->users_model->edit($data, ['book_id' => $id]);
            if($response){
                $res = true;
            }
            session()->setFlashdata('message_success', "Device changed Successfully!");
        }
        
        return redirect()->to(base_url('admin/books/index'));
    }

    
    
    
    
    
}