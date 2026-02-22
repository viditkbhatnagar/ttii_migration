<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Enrol_model;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;
use App\Models\Video_progress_model;
use App\Models\Material_progress_model;
use App\Models\Exam_model;
use App\Models\Exam_questions_model;
use App\Models\Exam_attempt_model;
use App\Models\Exam_answer_model;
use App\Models\Practice_attempt_model;
use App\Models\Practice_answer_model;
use App\Models\Subject_model;
use App\Models\Course_key_learning_model;


class Course_model extends Base_model
{
    protected $table         = 'course';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Course';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];

     public function course_data($courses, $user_course_id = null, $user_id=null) {
    if (!$courses || !is_array($courses)) {
        log_message('error', print_r('Invalid course data: ' . print_r($courses, true), true));
        return []; // or return null, based on how you handle this in your app
    }
    
    $this->enrol_model = new Enrol_model();
    $this->category_model = new Category_model();
    $this->subject_model = new Subject_model();
    $this->lesson_model = new Lesson_model();
    $this->review_model = new Review_model();
    $this->course_key_learning_model = new Course_key_learning_model();

    $coursedata = [
        'id' => $courses['id'] ?? '',
        'title' => $courses['title'] ?? '',
        'label' => $courses['label'] ?? '',
        'status' => $courses['status'] ?? '',
        'price' => $courses['price'] ?? '',
        'offer_price' => $courses['sale_price'] ?? '',
        'description' => $courses['description'] ? strip_tags($courses['description']) : '',
        'short_description' => $courses['description'] ? mb_substr(strip_tags($courses['description']), 0, 60) . '...' : '',
        'duration' => $courses['duration'] ?? '',
        'thumbnail' => valid_file($courses['thumbnail']) ? base_url(get_file($courses['thumbnail'])) : '',
        'cover_image' => valid_file($courses['course_icon']) ? base_url(get_file($courses['course_icon'])) : '',
        'enrolments' => $this->enrol_model->get(['course_id' => $courses['id']])->getNumRows(),
        'features' => $this->course_benefits($courses['features']),
        'who_should_enrol' => json_decode($courses['features']) ?? [],
        'is_enrolled'=> $this->enrol_model->get(['course_id' => $courses['id'],'user_id'=> $user_id])->getNumRows() > 0 ? 1 : 0 ,
        'lessons_count' => $this->lesson_model->get(['course_id' => $courses['id']])->getNumRows(),
        'subject_count' => $this->subject_model->get(['course_id' => $courses['id']])->getNumRows(),
        'total_reviews' => $this->review_model->get(['course_id' => $courses['id']])->getNumRows(),
        'total_rating' => $this->review_model->average_rating_by_course($courses['id']),
    ];

    return $coursedata;
}

    private function course_benefits($features) {
        $data = [
            [
                'id' => 1,
                'title' => 'Achieve greater focus and inner calm.',
            ],
            [
                'id' => 2,
                'title' => 'Reduce stress and anxiety through daily practice.',
            ],
            [
                'id' => 3,
                'title' => 'Improve emotional regulation and self-awareness.',
            ],
        ];
        
        preg_match_all('/<li>(.*?)<\/li>/', $features, $matches);

        $featuresArray = [];
        foreach ($matches[1] as $index => $title) {
            $featuresArray[] = [
                'id' => $index + 1,
                'title' => strip_tags(trim($title)),
            ];
        }
        return $featuresArray;
    }
    
    private function key_learning($course_id) {
        $this->course_key_learning_model = new Course_key_learning_model();
        
        $data = $this->course_key_learning_model->get(['course_id' => $course_id], ['id', 'title', 'image'])->getResultArray();
        foreach($data as $key=> $value){
            $data[$key]['image'] = valid_file($value['image']) ? base_url(get_file($value['image'])) : ''; 
        }
        return $data;
    }
    
    public function get_total_streak($course_id){
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->video_progress_model = new Video_progress_model();
        
        $lesson_ids = array_column($this->lesson_model->get(['course_id' => $course_id])->getResultArray(),'id');
        $lesson_video_ids = $lesson_ids!=NULL ? array_column($this->lesson_file_model->get(['lesson_id' => $lesson_ids, 'attachment_type' => 'url'])->getResultArray(),'id') : 0;
        $video_progress = $lesson_video_ids!=NULL ? $this->video_progress_model->get(['lesson_file_id' => $lesson_video_ids, 'status' => 1])->getNumRows() : 0;
        $streak = $video_progress*10;
        return $streak;
    }
    
    
    public function get_streak_data($user_id,$course_id, $from_date, $to_date){
        $logger = service('logger');
        
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->video_progress_model = new Video_progress_model();

        $lesson_ids = array_column($this->lesson_model->get(['course_id' => $course_id])->getResultArray(),'id');
        $lesson_video_ids = $lesson_ids!=NULL ? array_column($this->lesson_file_model->get(['lesson_id' => $lesson_ids, 'attachment_type' => 'url'])->getResultArray(),'id') : 0;
        
        $streak_data['total_streak'] = 0;
        $streak_data['current_streak'] = 0;
        
        if($lesson_video_ids!=NULL){
            $query = $this->db->table('video_progress_status');
            $query->whereIn('lesson_file_id', $lesson_video_ids);
            $query->where('status', 1);
            $query->groupStart();
            $query->where("date(created_at) >=", date('Y-m-d', strtotime($from_date)));
            $query->orWhere("date(updated_at) >=", date('Y-m-d', strtotime($from_date)));
            $query->groupEnd();
            $query->groupStart();
            $query->where("date(created_at) <=", date('Y-m-d', strtotime($to_date)));
            $query->orWhere("date(updated_at) <=", date('Y-m-d', strtotime($to_date)));
            $query->groupEnd();
            $query->where('video_progress_status.deleted_at IS NULL');
            $total_streak = $query->get()->getNumRows();
            $streak_data['total_streak'] = $total_streak*10;

            $query_current = $this->db->table('video_progress_status');
            $query_current->whereIn('lesson_file_id', $lesson_video_ids);
            $query_current->where('status', 1);
            $query_current->groupStart();
            $query_current->where("date(created_at)", date('Y-m-d'));
            $query_current->orWhere("date(updated_at)", date('Y-m-d'));
            $query_current->groupEnd();
            $query_current->where('video_progress_status.deleted_at IS NULL');
            $current_streak = $query_current->get()->getNumRows();
            $streak_data['current_streak'] = $current_streak*10;
        }
        return $streak_data;
    }
    
    
    
    public function get_performance_data($user_id, $course_id){
        // print_r($course_id); exit();
        $user_progress = $this->get_user_progress($user_id,$course_id);
        
        // echo "<pre>";
        // print_r($user_progress); exit();
        
        $progress['title']                      = $this->get(['id' => $course_id])->getRow()->title;
        $progress['overall_performance']        = round($user_progress['overall_performance']);
        $progress['exam_percentage']            = round($user_progress['exam_percentage']);
        $progress['assignment_percentage']      = round($user_progress['assignment_percentage']);

        $progress['total_video_watched']        = $user_progress['completed_videos'];
        $progress['total_video']                = $user_progress['total_videos'];
        $progress['total_materials_watched']    = $user_progress['completed_materials'];
        $progress['total_exam_attempted']       = $user_progress['completed_exams'];
        $progress['total_exams']                = $user_progress['total_exams'];
        $progress['total_practice_attempted']   = $user_progress['attended_practices'];
        // $progress['total_questions_answered']   = $user_progress['total_questions'];
        // $progress['total_correct_answers']      = $user_progress['correct_answers'];
        // $progress['total_wrong_answers']        = $user_progress['wrong_answers'];
        // $progress['total_skipped_answers']      = $user_progress['skipped_questions'];
        // $progress['total_questions_in_exam']    = $user_progress['total_questions_in_exam'];
        $progress['total_practice']             = $user_progress['total_practice'];
        // $progress['attended_live_classes']   = $user_progress['attended_live_classes'];
        $progress['subject_wise_report']        = $this->subject_wise_progress($user_id,$course_id);
        return $progress;
    }

     public function get_user_progress($user_id, $course_id=0, $subject_id=0){
        $this->lesson_model = new Lesson_model();
        $this->lesson_file_model = new Lesson_file_model();
        $this->video_progress_model = new Video_progress_model();
        $this->material_progress_model = new Material_progress_model();
        $this->exam_model = new Exam_model();
        $this->exam_questions_model = new Exam_questions_model();
        $this->exam_attempt_model = new Exam_attempt_model();
        $this->exam_answer_model = new Exam_answer_model();
        $this->practice_attempt_model = new Practice_attempt_model();
        $this->practice_answer_model = new Practice_answer_model();
        
        $this->assignment_model = new Assignment_model();
        $this->assignment_submissions_model = new Assignment_submissions_model();
        
        
        $total_assignments =  $this->assignment_model->get(['course_id' => $course_id])->getNumRows();
        $completed_assignments =   $this->assignment_submissions_model->get(['course_id' => $course_id,'user_id' =>$user_id])->getNumRows();
        
        
        if($subject_id >0){
            //log_message('error', $subject_id);
            $lesson_ids = array_column($this->lesson_model->get(['subject_id' => $subject_id])->getResultArray(), 'id');
        }else if($course_id >0){
           $lesson_ids = array_column($this->lesson_model->get(['course_id' => $course_id])->getResultArray(), 'id');
        }

        $lesson_ids = $lesson_ids!=NULL ? $lesson_ids : 0;
        
        // log_message('error', print_r("lesson_ids",true));
        // log_message('error', print_r($lesson_ids,true));


        //videos
        $videos = $this->lesson_file_model->get(['lesson_type' => 'video', 'lesson_id' => $lesson_ids]);
        $total_videos = $videos->getNumRows();
        $video_ids = array_column($videos->getResultArray(), 'id');
        $video_ids = $video_ids!=NULL ? $video_ids : 0;
        
        $completed_videos = $this->video_progress_model->get(['lesson_file_id' => $video_ids, 'user_id' => $user_id, 'status' => 1])->getNumRows(); //removed course_id where
        
        //materials
        $materials = $this->lesson_file_model->get(['lesson_type' => 'other', 'lesson_id' => $lesson_ids]);
        $total_materials = $materials->getNumRows();
        //log_message('error', print_r('total_materials'.$total_materials,true));
        //log_message('error', 'lesson_ids : ' . print_r($lesson_ids, true));
        $material_ids = array_column($materials->getResultArray(), 'id');
        $material_ids = $material_ids!=NULL ? $material_ids : 0;

        //log_message('error', print_r($material_ids,true));
        
        $completed_materials =  $this->material_progress_model->get(['lesson_file_id' => $material_ids, 'user_id' => $user_id])->getNumRows();  //removed course_id where

        //log_message('error', print_r('completed_materials blahblah'.$completed_materials,true));
        


        //exams
        $where = [];
        if($course_id>0){
            $where['course_id'] = $course_id;
        }
        // if($subject_id>0){
        //     $where['subject_id'] = $subject_id;
        // }
        $exams = $this->exam_model->get($where);

        
        
        // $total_exams = $exams->getNumRows();
        // $exam_ids = array_column($exams->getResultArray(), 'id');
        // $exam_ids = $exam_ids!=NULL ? $exam_ids : 0;
        // $completed_exams = $this->exam_attempt_model->get(['user_id' => $user_id, 'exam_id' => $exam_ids],[],[],[],['exam_attempt.exam_id'])->getNumRows();

        $exam_ids = array_column($this->lesson_file_model->get(['lesson_id' => $lesson_ids,'attachment_type' => 'quiz'],null,['order' => 'asc'])->getResultArray(),'id'); //aurora-sort
        $quiz_completed      =  $exam_ids!=NULL ? $this->practice_attempt_model->get(['user_id' => $user_id, 'submit_status' => 1, 'lesson_file_id' => $exam_ids],NULL,NULL,NULL,['lesson_file_id'])->getNumRows() : 0;
        $total_exams         = count($exam_ids);
        $completed_exams     = $quiz_completed;

        //practice
        $attempted_practices    = $this->practice_answer_model->get(['user_id' => $user_id, 'answer_submitted' => 1], NULL, NULL, NULL, ['attempt_id'])->getNumRows();
        $total_practice         = $this->practice_attempt_model->get(['user_id' => $user_id,'lesson_id' => $lesson_ids])->getNumRows();

   

        $data['total_videos'] = $total_videos;
        $data['completed_videos'] = $completed_videos;
        $data['total_materials'] = $total_materials;
        $data['completed_materials'] = $completed_materials;
        $data['total_exams'] = $total_exams;
        $data['completed_exams'] = $completed_exams;
        $data['total_practice'] = $total_practice;
        $data['attended_practices'] = $attempted_practices;
        
        $data['assignments'] = $total_assignments;
        $data['completed_assignments'] = $completed_assignments;
        
        $data['video_percentage'] = ($total_videos > 0) 
            ? round(($completed_videos / $total_videos) * 100, 2) 
            : 0;
        
        $data['material_percentage'] = ($total_materials > 0) 
            ? round(($completed_materials / $total_materials) * 100, 2) 
            : 0;
        
        $data['exam_percentage'] = ($total_exams > 0) 
            ? round(($completed_exams / $total_exams) * 100, 2) 
            : 0;
            
        $data['assignment_percentage']= ($total_assignments > 0) 
            ? round(($completed_assignments / $total_assignments) * 100, 2) 
            : 0;
        
        $data['practice_percentage'] = ($total_practice > 0) 
            ? round(($attempted_practices / $total_practice) * 100, 2) 
            : 0;
               
       
        $total_activities = $total_videos+$total_materials+$total_practice+$total_assignments;
        // $total_activities = $total_videos+$total_materials+$total_exams+$total_practice+$total_assignments;


        $completed_activities = $completed_videos+$completed_materials+$attempted_practices+$completed_assignments;
        // $completed_activities = $completed_videos+$completed_materials+$completed_exams+$attempted_practices+$completed_assignments;


        //Uncomment the following lines to log the detailed progress data
        // log_message('error', 'Total Activities: ' . $total_activities . ', Completed Activities: ' . $completed_activities);
        // log_message('error', 'Total Videos: ' . $total_videos);
        // log_message('error', 'Completed Videos: ' . $completed_videos);

        // log_message('error', 'Total Materials: ' . $total_materials);
        // log_message('error', 'Completed Materials: ' . $completed_materials);

        // log_message('error', 'Total Exams: ' . $total_exams);
        // log_message('error', 'Completed Exams: ' . $completed_exams);

        // log_message('error', 'Total Practice: ' . $total_practice);
        // log_message('error', 'Attended Practices: ' . $attempted_practices);

        // log_message('error', 'Total Assignments: ' . $total_assignments);
        // log_message('error', 'Completed Assignments: ' . $completed_assignments);

        // // Percentages
        // log_message('error', 'Video Percentage: ' . $data['video_percentage'] . '%');
        // log_message('error', 'Material Percentage: ' . $data['material_percentage'] . '%');
        // log_message('error', 'Exam Percentage: ' . $data['exam_percentage'] . '%');
        // log_message('error', 'Assignment Percentage: ' . $data['assignment_percentage'] . '%');
        // log_message('error', 'Practice Percentage: ' . $data['practice_percentage'] . '%');


        $data['overall_performance'] = $total_activities > 0 ? ($completed_activities/$total_activities)*100 : 0;
        $data['progress'] = $total_activities > 0 ? ($completed_activities/$total_activities)*100 : 0;
        
        // echo "<pre>";
        // print_r($data); exit();

        //log_message('error',print_r($data,true));
        return $data;
    }
    
    public function subject_wise_progress($user_id, $course_id){
        $this->subject_model = new Subject_model();

        $subjects = $this->subject_model->get(['course_id' => $course_id],['id', 'title'])->getResultArray();
        
        foreach($subjects as $key=> $subject){
            $progress = $this->get_user_progress($user_id, 0, $subject['id']);
            
        //exams
        $where = [];
        if($course_id>0){
            $where['course_id'] = $course_id;
        }
        if($subject['id']>0){
            $where['subject_id'] = $subject['id'];
        }
        $exams = $this->exam_model->get($where);
        
        $subjects[$key]['total_exams'] = $exams->getNumRows();
        $exam_ids = array_column($exams->getResultArray(), 'id');
        $exam_ids = $exam_ids!=NULL ? $exam_ids : 0;
        
        // $completed_exams = $this->exam_attempt_model->get(['user_id' => $user_id, 'exam_id' => $exam_ids])->getNumRows();
        //progress_for_each_subject    
        $subjects[$key]['progress'] = 0;
        $subjects[$key]['total_videos'] = 0;
        $subjects[$key]['completed_videos'] = 0;
        $subjects[$key]['total_materials'] = 0;
        $subjects[$key]['completed_materials'] = 0;
        $subjects[$key]['total_exams'] = 0;
        $subjects[$key]['completed_exams'] = 0;
        $subjects[$key]['attended_practices'] = 0;
        $subjects[$key]['total_questions_answered'] = 0;
        $subjects[$key]['correct_answers'] = 0;
        $subjects[$key]['wrong_answers'] = 0;
        $subjects[$key]['skipped_questions'] = 0;
        $subjects[$key]['total_questions_in_exam'] = 0;
        $subjects[$key]['total_practice'] = 0;    
            
        }
        return $subjects;
    }
    
}
