<?php namespace App\Models;

use CodeIgniter\Model;

class Batch_model extends Base_model
{
    protected $table         = 'batch';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Batch';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
    public function get_batch_students($id) 
    {
        $query = $this->db->table('batch_students')
            ->select('name,phone,email,batch_students.created_at')
            ->join('users', 'users.id = batch_students.user_id')
            ->orderBy('users.name', 'asc')
            ->get()
            ->getResultArray();
        return $query;
    }


}
