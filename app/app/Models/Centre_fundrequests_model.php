<?php namespace App\Models;

use CodeIgniter\Model;

class Centre_fundrequests_model extends Base_model
{
    protected $table         = 'centre_fund_requests';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Centre_fundrequests';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated
    
//     public function getLastCentre()
// {
//     return $this->db->table($this->table)
//         ->orderBy('centre_id', 'DESC')
//         ->limit(1)
//         ->get()
//         ->getRowArray();
// }


    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
        


}
