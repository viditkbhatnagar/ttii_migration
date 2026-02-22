<?php
namespace App\Controllers\App;

use App\Controllers\App\UserBaseController;
use App\Models\Lesson_model;
use App\Models\Lesson_file_model;

class Materials extends UserBaseController
{
    private $lesson_model;
    private $lesson_file_model;
    
    public function __construct()
    {
        parent::__construct();
        $this->uri = service('uri');
        $this->lesson_file_model = new Lesson_file_model();
        $this->lesson_model = new Lesson_model();
    }

    public function index($lesson_id)
    {
        $this->data['video_data'] = $this->lesson_file_model->get(['lesson_id' => $lesson_id])->getResultArray();
        $this->data['page_title'] = 'Materials';
        $this->data['page_name'] = 'Materials/index';
        return view('App/index', $this->data);
    }
    
 public function course_materials($course_id)
{
    // Get all lesson IDs under the given course ID
    $all_lessons = $this->lesson_model->get(['course_id' => $course_id])->getResultArray();
    
    $material_data = [
        'materials' => [],
        'practice' => []
    ];

    if (!empty($all_lessons)) {
        foreach ($all_lessons as $val) {
            // Separate materials and practice materials
            $materials = $this->lesson_file_model->get(['lesson_id' => $val['id'], 'attachment_type' => 'pdf', 'is_practice' => 0])->getResultArray();
            foreach ($materials as $material) {
                $material_data['materials'][] = $this->lesson_file_model->lesson_material_data($material, $this->user_id);
            }

            $practice_materials = $this->lesson_file_model->get(['lesson_id' => $val['id'], 'attachment_type' => 'pdf', 'is_practice' => 1])->getResultArray();
            foreach ($practice_materials as $practice_material) {
                $material_data['practice'][] = $this->lesson_file_model->lesson_material_data($practice_material, $this->user_id);
            }
        }
    }

    $this->data['material_data'] = $material_data;
    $this->data['page_title'] = 'Materials';
    $this->data['page_name'] = 'Materials/index';
    return view('App/index', $this->data);
}

public function subject_materials($subject_id)
{
    // Get all lesson IDs under the given subject ID
    $lesson_ids = array_column($this->lesson_model->get(['subject_id' => $subject_id])->getResultArray(), 'id');

    $material_data = [
        'materials' => [],
        'practice' => []
    ];

    if (!empty($lesson_ids)) {
        $materials = $this->lesson_file_model->get(['lesson_id' => $lesson_ids, 'attachment_type' => 'pdf', 'is_practice' => 0])->getResultArray();
        foreach ($materials as $material) {
            $material_data['materials'][] = $this->lesson_file_model->lesson_material_data($material, $this->user_id);
        }

        $practice_materials = $this->lesson_file_model->get(['lesson_id' => $lesson_ids, 'attachment_type' => 'pdf', 'is_practice' => 1])->getResultArray();
        foreach ($practice_materials as $practice_material) {
            $material_data['practice'][] = $this->lesson_file_model->lesson_material_data($practice_material, $this->user_id);
        }
    }

    $this->data['material_data'] = $material_data;
    $this->data['page_title'] = 'Materials';
    $this->data['page_name'] = 'Materials/index';
    return view('App/index', $this->data);
}

    public function materials_view($id)
    {
        if ($id) {
            $file = base_url(get_file($this->lesson_file_model->get(['id' => $id])->getRow()->attachment));
            
            // Define the required variables 
            $this->data['file'] = $file;
            $this->data['user_id'] = $this->user_id;
            $this->data['page_title'] = 'Materials'; // Set the page title
            $this->data['page_name'] = 'Materials_view/index'; // Set the page name
            
            return view('App/index', $this->data);
        } else {
            log_message('error', 'File parameter missing');
            // Handle error if 'item' parameter is missing
            return redirect()->to(base_url('app/course/my_course'));
        }
    }
}
