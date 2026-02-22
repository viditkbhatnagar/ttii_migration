<?php
namespace App\Controllers\Admin;

// use App\Models\Instructor_enrol_model;
use App\Models\Books_model;
use App\Models\Books_chapters_model;

class Book_report extends AppBaseController
{
    private $books_model;

    
    public function __construct()
    {
        parent::__construct();
        $this->books_chapters_model = new Books_chapters_model();
        // $this->instructor_enrol_model = new Instructor_enrol_model();
        $this->books_model = new Books_model();

    }

    public function index()
{
    // Initialize filter array
    $filter_where = [];
    
    // Status filter (available/unavailable)
    $status = $this->request->getGet('status');
    
    if (!empty($status)&& $status != 'all') {
        $filter_where['status'] = $status;
    }

    // Date filter (if needed)
    if (!empty($this->request->getGet('from_date')) && !empty($this->request->getGet('to_date'))) {
        $filter_where['created_at >='] = $this->request->getGet('from_date') . ' 00:00:00';
        $filter_where['created_at <='] = $this->request->getGet('to_date') . ' 23:59:59';
    }

    // Get filtered books
    $books = $this->books_model->get(
        $filter_where,
        ['book_id', 'title', 'author', 'description', 'cover_image', 'status', 'created_at'],
        ['book_id', 'desc']
    )->getResultArray();

    // Prepare data for view
    $this->data['list_items'] = $books;
    // echo"<pre>";print_r($this->data);die();
    // $this->data['current_filter'] = $status; // For keeping filter state in view
    $this->data['page_title'] = 'Books Report';
    $this->data['page_name'] = 'Book_report/index';

    return view('Admin/index', $this->data);
}
    
    public function ajax_add(){
        
        // $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
        // $this->data['country_code'] = get_country_code();

        echo view('Admin/Books/ajax_add', $this->data);
    }

    public function add(){
        if ($this->request->getMethod() === 'post'){
            
            $title = $this->request->getPost('title');
            $author = $this->request->getPost('author');
            $description = $this->request->getPost('description');
            // $photo = $this->request->getPost('photo');
            $status = $this->request->getPost('status');
            $check_book_duplication = $this->books_model->get(['title' => $title ,'author' => $author])->getNumRows();

            // $check_phone_duplication = $this->users_model->get(['country_code' => $code ,'phone' => $phone])->getNumRows();
            // $check_email_duplication = $this->users_model->get(['user_email' => $email])->getNumRows();
           
            
                $data = [
                    'title'       => $title,
                    'author'      => $author,
                    'description' => $description,
                    'status'      => $status,
                    'created_by' => get_user_id(),
                    'updated_by' => get_user_id(),
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                    // 'book_name' => $this->request->getPost('name'),
                    // 'title' => $this->request->getPost('title'),
                    // 'whatsapp_code' => $this->request->getPost('whatsapp_code'),
                    // 'whatsapp_phone' => $this->request->getPost('whatsapp_phone'),
                    // 'user_email'     => $email,
                    // 'country_code'      => $code,
                    // 'phone'     => $phone,
                    // 'password'     => $this->users_model->password_hash($this->request->getPost('password')),                             
                    // 'qualification' => $this->request->getPost('qualification'),
                    // 'biography' => $this->request->getPost('biography'),
                    // 'role_id'     => 3,
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

    public function ajax_edit($id){
        $this->data['edit_data'] = $this->books_model->get(['book_id' => $id])->getRowArray();
        
        // $this->data['countries'] = $this->country_model->get([], ['country_id', 'country'])->getResultArray();
        // $this->data['country_code'] = get_country_code();

        echo view('Admin/Books/ajax_edit', $this->data);
    }

    public function edit($id){
    if ($this->request->getMethod() === 'post'){
        
        $title = $this->request->getPost('title');
        $author = $this->request->getPost('author');
        $description = $this->request->getPost('description');
        $status = $this->request->getPost('status');
        
        // $check_book_duplication = $this->books_model->get(['title' => $title ,'author' => $author,'id !=' => $id])->getNumRows();
        // $check_email_duplication = $this->users_model->get(['email' => $email,'id !=' => $id])->getNumRows();
        
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

        $image = $this->upload_file('instructor', 'cover_image');
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

    } else {
        session()->setFlashdata('message_danger', "Book already exists"); 
    }
    
    return redirect()->to(base_url('admin/books/index'));
}



    public function ajax_view($id){
        $this->data['view_data'] = $this->books_model->get(['book_id' => $id])->getRowArray();
        echo view('Admin/Books/ajax_view', $this->data);
    }

    public function delete($id){
        if ($id > 0){
            $chapter_data = $this->books_chapters_model->get(['book_id' => $id])->getNumRows();
            if($chapter_data == 0){
                if ($this->books_model->remove(['book_id' => $id])){
                    session()->setFlashdata('message_success', "Book Deleted Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "You Can\'t Delete Book! Please remove chapters first");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/books/index'));
    }
    
    
    
    public function chapters($id) {
    // Fetching chapter details from the database
    $chapters = $this->books_chapters_model->get(['book_id' => $id])->getResultArray();
    print_r($chapters);
    die();

    // Checking if data is being fetched
    if (empty($chapters)) {
        echo "No chapters found for this book.";
        die(); // Stop execution to see the output
    }

    // Passing the data to the view
    $this->data['chapters'] = $chapters;
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
    
    
     public function chapter_delete($id){
        if ($id > 0){
            if ($this->books_chapters_model->remove(['book_id' => $id])){
                session()->setFlashdata('message_success', "Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/books/chapters/$id'));
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