<?php
namespace App\Controllers\Admin;
use App\Models\Question_model;
use App\Models\Question_bank_model;

use App\Models\Category_model;
use App\Models\Course_model;
use App\Models\Subject_model;
use App\Models\Lesson_model;



use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;



class Question extends AppBaseController
{
    private $question_model;
    private $question_bank_model;
    private $course_model;
    private $category_model;
    private $subject_model;
    private $lesson_model;
    
    
    public function __construct()
    {
        parent::__construct();
        $this->question_model = new Question_model();
        $this->question_bank_model = new Question_bank_model();
        $this->course_model = new Course_model();
        $this->category_model = new Category_model();
        $this->subject_model = new Subject_model();
        $this->lesson_model = new Lesson_model();
    }

   
    
    public function bulk_upload(){
        
        $this->data['category'] = $this->category_model->get()->getResultArray();
        $this->data['course'] = $this->course_model->get()->getResultArray();
        $this->data['subject'] = $this->subject_model->get()->getResultArray();
        $this->data['lesson'] = $this->lesson_model->get()->getResultArray();
        
        
        $this->data['page_title'] = 'Question';
        $this->data['page_name'] = 'Question/bulk_upload';
        return view('Admin/index', $this->data);
    }
    
    
    public function question_excel_upload()
    {
        if ($this->request->getMethod() === 'post'){
            
            $category_id = $this->request->getPost('category_id');
            $course_id = $this->request->getPost('course_id');
            $subject_id = $this->request->getPost('subject_id');
            $lesson_id = $this->request->getPost('lesson_id');
            
    
    
            
             $excel_file = $this->upload_file('excel_file','excel_file');
     
            $path = WRITEPATH.'/'.$excel_file['file'];
            $spreadsheet = IOFactory::load($path);
            
            $firstRow = $spreadsheet->getActiveSheet()->getRowIterator()->current();
            $actualHeadings = [];
            foreach ($firstRow->getCellIterator() as $cell) {
                $actualHeadings[] = $cell->getValue();
            }
            
             // Define expected column headings
            $expectedHeadings = ['Question No', 'Question Title', 'Option A', 'Option B','Option C','Option D','Answer']; // Adjust these as per your actual column headings

            
            // Check if actual headings match expected headings
            if (array_slice($actualHeadings, 0, 7) !== $expectedHeadings) {
                // Column headings mismatch
                // Handle error or return with a message
                session()->setFlashdata('message_danger', "Invlid Excel Format. Download the template from the form and try again..!");
                return redirect()->to(base_url('admin/question/bulk_upload'));
            }
            
             // Check if sheet contains data other than header
            $worksheet = $spreadsheet->getActiveSheet();
            $dataRowCount = $worksheet->getHighestRow() - 1; // Exclude header row
            if ($dataRowCount == 0) {
                // No data rows found
                // Handle error or return with a message
                session()->setFlashdata('message_danger', "No data found in the uploaded sheet. Please ensure the sheet contains data below the header row.");
                return redirect()->to(base_url('admin/question/bulk_upload'));
            }
            
            $scount = 0;
            
          
          
            
            foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                $highestRow = $worksheet->getHighestRow();
                $highestColumn = $worksheet->getHighestColumn();
                
                for ($row = 2; $row <= $highestRow; $row++) {
                    
                    $data = [];
                    $data['category_id']  = $category_id;
                    $data['course_id']  = $course_id;
                    $data['subject_id'] = $subject_id;
                    $data['lesson_id']  = $lesson_id;
                    $data['title'] = $this->remove_excel_icon($worksheet->getCellByColumnAndRow(2, $row)->getValue());
                    $data['number_of_options'] = 4;
                    $options = [];
                    $options[] = $this->remove_excel_icon($worksheet->getCellByColumnAndRow(3, $row)->getValue());
                    $options[] = $this->remove_excel_icon($worksheet->getCellByColumnAndRow(4, $row)->getValue());
                    $options[] = $this->remove_excel_icon($worksheet->getCellByColumnAndRow(5, $row)->getValue());
                    $options[] = $this->remove_excel_icon($worksheet->getCellByColumnAndRow(6, $row)->getValue());
                    $data['options'] = json_encode($options);
                    
                    $answer = $worksheet->getCellByColumnAndRow(7, $row)->getValue();
                    if(empty($answer)){
                        continue;
                    }
                    
                    $data['correct_answers'] = json_encode(["{$answer}"]);

                    $data['order'] = 0;
                    $data['q_type'] = 1;
                    $data['created_by']     = get_user_id();
                    $data['updated_by']     = get_user_id();
                    $data['created_at']     = date('Y-m-d H:i:s');
                    $data['updated_at']     = date('Y-m-d H:i:s');
                    
                 
                //  echo "<pre>";
                //  print_r($data); exit();

                    $questions = $this->question_bank_model->add($data);
                    
                    if ($questions){
                        
                        $scount ++;
                        
                    } else {
                        session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                    }
                }
            }
            
            
            if($scount > 0)
            {
                session()->setFlashdata('message_success', $scount." Question Added Successfully!");
            }
            return redirect()->to(base_url('admin/question_bank/index'));
        }
    }

    
    
    
    public function get_course_by_category()
    {
        $category_id = $this->request->getPost('category_id'); // Assuming team_ids is sent via AJAX
        $course = $this->course_model->get(['category_id'=>$category_id])->getResultArray();
        return json_encode($course);
    }
    
     public function get_subject_by_course()
    {
        $course_id = $this->request->getPost('course_id'); // Assuming team_ids is sent via AJAX
        $subject = $this->subject_model->get(['course_id'=>$course_id])->getResultArray();
        return json_encode($subject);
    }
    
     public function get_lesson_by_course()
    {
        $course_id = $this->request->getPost('course_id'); // Assuming team_ids is sent via AJAX
        $lesson = $this->lesson_model->get(['course_id'=>$course_id])->getResultArray();
        return json_encode($lesson);
    }
    
    
     public function get_lesson_by_subject()
    {
        $subject_id = $this->request->getPost('subject_id'); // Assuming team_ids is sent via AJAX
        $lesson = $this->lesson_model->get(['subject_id'=>$subject_id])->getResultArray();
        return json_encode($lesson);
    }
    
    function remove_excel_icon($value) {
    // Your logic to remove Excel icons or formatting goes here
    // For example:
    $cleaned_value = strip_tags($value); // Remove HTML tags
    $cleaned_value = trim($cleaned_value); // Trim whitespace
    return $cleaned_value;
}
    

    
}
