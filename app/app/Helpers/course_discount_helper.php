<?php
// Private helper function

use App\Models\Course;

if (!function_exists('get_discounted_course_amount')){
    function get_discounted_amount($student_id,$course_id){
        $course_model = new Course();
        $data = $course_model->get_join([['enrol,enrol.user_id' => $student_id]],['enrol.course_id' => $course_id],['enrol.discount_perc'])->getRowArray();
        return $data['discount_perc'];

    }
}


