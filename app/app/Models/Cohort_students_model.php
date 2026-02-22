<?php namespace App\Models;

use CodeIgniter\Model;

class Cohort_students_model extends Base_model
{
    protected $table         = 'cohort_students';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Cohort_students';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
   protected $allowedFields = ['user_id', 'cohort_id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_by', 'deleted_at'];
    // Optional: Define validation rules
    protected $validationRules    = [
        'cohort_id' => 'required',
    ];
    
    



//  commneted on - 04-12-25
//  public function is_locked($user_id, $subject)
// {
//     $this->cohorts_model = new Cohorts_model();
    
//     log_message('error', 'is_locked called for user_id: ' . $user_id . ' subject: ' . print_r($subject, true));

//     // Get all cohorts for this user
//     $user_cohorts = $this->get(['user_id' => $user_id])->getResultArray();
    
//     log_message('error', 'user_cohorts result: ' . print_r($user_cohorts, true));
    
//     // Check if user has any cohorts
//     if (empty($user_cohorts)) {
//         log_message('error', 'User not in any cohort - returning locked');
//         return true; // User is not enrolled in any cohort
//     }
    
//     // Check each cohort to see if any matches the subject
//     foreach ($user_cohorts as $user_cohort) {
//         if (!isset($user_cohort['cohort_id'])) {
//             continue;
//         }
        
//         $cohort_id = $user_cohort['cohort_id'];
//         log_message('error', 'Checking cohort_id: ' . $cohort_id);
        
//         // Get cohort details
//         $cohort_data = $this->cohorts_model->get(['id' => $cohort_id])->getRowArray();


//         // Check if cohort exists and matches the subject
//         if ($cohort_data && 
//             isset($cohort_data['subject_id']) && 
//             ($cohort_data['subject_id'] == $subject['id'] ||   // Check if subject_id matches or if master_subject_id matches - 11/11/25 
//              $cohort_data['subject_id'] == $subject['master_subject_id'])) {
//             log_message('error', 'Found matching cohort for subject - returning unlocked');
//             return false; // User has access to this subject
//         }
//     }
    
//     log_message('error', 'No matching cohort found for subject - returning locked');
//     return true; // No cohort matches this subject
// }


  //updated on - 04-12-25 - reverse mastersubject id check with cohort subject
//   public function is_locked($user_id, $subject)
//   {
//       $this->cohorts_model = new Cohorts_model();
//       $this->subject_model = new Subject_model(); // Add this
      
//       log_message('error', 'is_locked called for user_id: ' . $user_id . ' subject: ' . print_r($subject, true));

//       // Get all cohorts for this user
//       $user_cohorts = $this->get(['user_id' => $user_id])->getResultArray();
      
//       log_message('error', 'user_cohorts result: ' . print_r($user_cohorts, true));
      
//       // Check if user has any cohorts
//       if (empty($user_cohorts)) {
//           log_message('error', 'User not in any cohort - returning locked');
//           return true; // User is not enrolled in any cohort
//       }
      
//       // Check each cohort to see if any matches the subject
//       foreach ($user_cohorts as $user_cohort) {
//           if (!isset($user_cohort['cohort_id'])) {
//               continue;
//           }
          
//           $cohort_id = $user_cohort['cohort_id'];
//           log_message('error', 'Checking cohort_id: ' . $cohort_id);
          
//           // Get cohort details
//           $cohort_data = $this->cohorts_model->get(['id' => $cohort_id])->getRowArray();

//           if (!$cohort_data || !isset($cohort_data['subject_id'])) {
//               continue;
//           }
          
//           // Get the cohort's subject to check its master_subject_id
//           $cohort_subject = $this->subject_model->get(['id' => $cohort_data['subject_id']], ['id', 'master_subject_id'])->getRowArray();
          
//           // Determine the cohort's master subject ID
//           $cohort_master_subject_id = !empty($cohort_subject['master_subject_id']) 
//               ? $cohort_subject['master_subject_id'] 
//               : $cohort_subject['id'];
          
//           // Determine the current subject's master ID
//           $current_master_subject_id = !empty($subject['master_subject_id']) 
//               ? $subject['master_subject_id'] 
//               : $subject['id'];
          
//           log_message('error', 'Cohort master_subject_id: ' . $cohort_master_subject_id . ' vs Subject master_subject_id: ' . $current_master_subject_id);
          
//           // Check if the master subject IDs match
//           if ($cohort_master_subject_id == $current_master_subject_id) {
//               log_message('error', 'Found matching cohort for subject - returning unlocked');
//               return false; // User has access to this subject
//           }
//       }
      
//       log_message('error', 'No matching cohort found for subject - returning locked');
//       return true; // No cohort matches this subject
//   }
// 




    public function is_locked($user_id, $subject)
    {
        $this->cohorts_model = new Cohorts_model();
        $this->subject_model = new Subject_model();

        log_message('error', 'is_locked called for user_id: ' . $user_id . ' subject: ' . print_r($subject, true));

        // Get all cohorts for this user
        $user_cohorts = $this->get(['user_id' => $user_id])->getResultArray();

        log_message('error', 'user_cohorts result: ' . print_r($user_cohorts, true));

        // No cohorts -> locked (return null)
        if (empty($user_cohorts)) {
            log_message('error', 'User not in any cohort - returning null (locked)');
            return null;
        }

        foreach ($user_cohorts as $user_cohort) {
            if (!isset($user_cohort['cohort_id'])) {
                continue;
            }

            $cohort_id = $user_cohort['cohort_id'];
            log_message('error', 'Checking cohort_id: ' . $cohort_id);

            // Get cohort details
            $cohort_data = $this->cohorts_model->get(['id' => $cohort_id])->getRowArray();
            if (!$cohort_data || !isset($cohort_data['subject_id'])) {
                continue;
            }

            // Get the cohort's subject and master_subject_id
            $cohort_subject = $this->subject_model->get(['id' => $cohort_data['subject_id']], ['id', 'master_subject_id'])->getRowArray();
            if (empty($cohort_subject)) {
                continue;
            }

            $cohort_master_subject_id = !empty($cohort_subject['master_subject_id'])
                ? $cohort_subject['master_subject_id']
                : $cohort_subject['id'];

            $current_master_subject_id = !empty($subject['master_subject_id'])
                ? $subject['master_subject_id']
                : $subject['id'];

            log_message('error', 'Cohort master_subject_id: ' . $cohort_master_subject_id . ' vs Subject master_subject_id: ' . $current_master_subject_id);

            // If match -> unlocked: return cohort id
            if ($cohort_master_subject_id == $current_master_subject_id) {
                log_message('error', 'Found matching cohort for subject - returning cohort_id: ' . $cohort_id);
                return $cohort_id;
            }
        }

        log_message('error', 'No matching cohort found for subject - returning null (locked)');
        return null;
    }


}
