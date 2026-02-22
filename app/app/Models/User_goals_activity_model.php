<?php namespace App\Models;

use CodeIgniter\Model;
use App\Models\User_goals_model;

class User_goals_activity_model extends Base_model
{
    protected $table         = 'user_goals_activity';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\User_goals_activity';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    public function get_goal_details($goal_id, $user_id)
    {
        $user_id = 3;
        $this->user_goals_model = new User_goals_model();
        
        $goal = $this->user_goals_model->get(['id' => $goal_id])->getRowArray();
        
        if ($goal && isset($goal['start_date']) && isset($goal['end_date'])) {
            // Use the global namespace for DateTime
            $startDate = new \DateTime($goal['start_date']);
            $endDate = new \DateTime($goal['end_date']);
            $today = new \DateTime(); // Get today's date
            
            // Calculate the difference
            $interval = $startDate->diff($endDate);
            
            // Get total days
            $totalDays = $interval->days + 1;
            
            // Generate date array with status based on date comparison
            $dateArray = [];
            $completedDays = 0;
            $todayStatus = 0;
            $currentDate = clone $startDate;
            
            while ($currentDate <= $endDate) 
            {
                // Check goal existence for the current date
                $check_goal = $this->get(['user_id' => $user_id, 'goal_id' => $goal_id, 'date' => $currentDate->format('Y-m-d')])->getNumRows();
                
                if ($check_goal > 0) {
                    $status = "1"; // Set status to "1" if there's a record for this date
                } elseif ($currentDate < $today) {
                    $status = "2"; // Set status to "2" for past dates with no goal
                } else {
                    $status = "0"; // Set status to "0" if upcoming and no record exists
                }
                
                // Count completed days with status = 1
                if ($status == "1") {
                    $completedDays++;
                }
                
                // Check today's status
                if ($currentDate->format('Y-m-d') == $today->format('Y-m-d')) {
                    $todayStatus = ($status == "1") ? 1 : 0;
                }
                
                // Append the date and status to the array
                $dateArray[] = [
                    "date" => $currentDate->format('d-m-Y'),
                    "status" => $status
                ];
                $currentDate->modify('+1 day');
            }
            
            // Calculate progress as a percentage
            $progress = $totalDays>0 ? round(($completedDays / $totalDays) * 100) : 0;
        
            // Add total days and date array to the goal array
            $goal = [
                "id" => $goal['id'],
                "title" => $goal['title'],
                "today_status" => $todayStatus, // Assuming today is completed
                "progress" => $progress, // Placeholder value for progress
                "completed_days" => $completedDays, // Placeholder value for completed days
                "total_days" => $totalDays,
                "start_date" => date('d-m-Y', strtotime($goal['start_date'])),
                "end_date" => date('d-m-Y', strtotime($goal['end_date'])),
                "date_array" => $dateArray // Generated date array
            ];
        }
        
        return $goal;
    }



    
    
    // public function get_goal_details($goal_id, $user_id)
    // {
    //     $this->user_goals_model = new User_goals_model();
        
    //     $goal = $this->user_goals_model->get(['id' => $goal_id])->getRowArray();
        
    //     if ($goal && isset($goal['start_date']) && isset($goal['end_date'])) {
    //         // Use the global namespace for DateTime
    //         $startDate = new \DateTime($goal['start_date']);
    //         $endDate = new \DateTime($goal['end_date']);
            
    //         // Calculate the difference
    //         $interval = $startDate->diff($endDate);
            
    //         // Get total days
    //         $totalDays = $interval->days + 1;
            
    //         // Generate date array with status set to "1"
    //         $dateArray = [];
    //         $currentDate = clone $startDate;
            
    //         while ($currentDate <= $endDate) 
    //         {
    //             $check_goal = $this->get(['user_id' => $user_id,'goal_id'=>$goal_id,'date'=>$currentDate->format('Y-m-d')])->getNumRows();
                
    //             $dateArray[] = [
    //                 "date" => $currentDate->format('d-m-Y'),
    //                 "status" => "1" // Default status as "1"
    //             ];
    //             $currentDate->modify('+1 day');
    //         }
            
    //         // Add total days and date array to the goal array
    //         $goal = [
    //             "id" => $goal['id'],
    //             "title" => $goal['title'],
    //             "today_status" => "1", // Assuming today is completed
    //             "progress" => "30", // Placeholder value for progress
    //             "completed_days" => "3", // Placeholder value for completed days
    //             "total_days" => $totalDays,
    //             "start_date" => date('d-m-Y', strtotime($goal['start_date'])),
    //             "end_date" => date('d-m-Y', strtotime($goal['end_date'])),
    //             "date_array" => $dateArray // Generated date array
    //         ];
    //     }
        
    //     return $goal;
    // }


    // public function get_goal_details($goal_id, $user_id)
    // {
    //     $this->user_goals_model = new User_goals_model();
        
    //     $goal = $this->user_goals_model->get(['id' => $goal_id])->getRowArray();
        
    //     if ($goal && isset($goal['start_date']) && isset($goal['end_date'])) {
    //         // Use the global namespace for DateTime
    //         $startDate = new \DateTime($goal['start_date']);
    //         $endDate = new \DateTime($goal['end_date']);
            
    //         // Calculate the difference
    //         $interval = $startDate->diff($endDate);
            
    //         // Get total days
    //         $totalDays = $interval->days + 1;
            
    //         // Add total days to the goal array
    //         $goal = [
    //             "id" => $goal['id'],
    //             "title" => $goal['title'],
    //             "today_status" => "1", // 1 completed
    //             "progress" => "30",
    //             "completed_days" => "3",
    //             "total_days" => $totalDays,
    //             "start_date" => date('d-m-Y', strtotime($goal['start_date'])),
    //             "end_date" => date('d-m-Y', strtotime($goal['end_date'])),
    //             "date_array" => [
    //                 [
    //                     "date" => "25-10-2024",
    //                     "status" => "1"
    //                 ],
    //                 [
    //                     "date" => "26-10-2024",
    //                     "status" => "1"
    //                 ],
    //                 [
    //                     "date" => "27-10-2024",
    //                     "status" => "2"
    //                 ],
    //                 [
    //                     "date" => "28-10-2024",
    //                     "status" => "2"
    //                 ],
    //                 [
    //                     "date" => "29-10-2024",
    //                     "status" => "0"
    //                 ],
    //                 [
    //                     "date" => "30-10-2024",
    //                     "status" => "0"
    //                 ],
    //                 [
    //                     "date" => "31-10-2024",
    //                     "status" => "0"
    //                 ],
    //             ]
    //         ];
    //     }
        
    //     return $goal;
    // }


}
