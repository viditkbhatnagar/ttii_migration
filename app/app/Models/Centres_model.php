<?php namespace App\Models;

use CodeIgniter\Model;

class Centres_model extends Base_model
{
    protected $table         = 'centres';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Centres';  // Entity class name
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
