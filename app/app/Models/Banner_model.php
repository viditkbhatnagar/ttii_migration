<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\Enrol_model;
use App\Models\Course_model;

class Banner_model extends Base_model
{
    protected $table         = 'banners';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Category';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title', 'image', 'url', 'type', 'is_course_banner', 'course_id', 'created_at', 'updated_at', 'updated_by'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    public function get_banner($user_id = null){
        $this->enrol_model = new Enrol_model();
        $this->course_model = new Course_model();
        $banners = $this->get([],['id', 'title', 'image', 'url', 'type', 'is_course_banner', 'course_id'])->getResultArray();
        foreach($banners as $key => $banner){
            $banners[$key]['image'] = valid_file($banner['image']) ? base_url(get_file($banner['image'])) : '';
            $banners[$key]['url'] = $banner['url'] ? $banner['url'] : '';
            $banners[$key]['type'] = $banner['type'] ? $banner['type'] : '';
            if(!empty($banner['course_id'])){
                $banners[$key]['is_enrolled'] = $this->enrol_model->get(['course_id' => $banner['course_id'],'user_id'=> $user_id])->getNumRows() > 0 ? 1 : 0 ;
                $banners[$key]['course_title'] = $this->course_model->get(['id'=>$banner['course_id']])->getRow()->title;
                log_message('error',$user_id);
            }else{
                $banners[$key]['is_enrolled'] = 0;
            }

        }
        return $banners;
    }

}
