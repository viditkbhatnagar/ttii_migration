<?php namespace App\Models;

use CodeIgniter\Model;

class Notification_model extends Base_model
{
    protected $table         = 'notification';      // Database table name
    protected $primaryKey    = 'id';         // Primary key of the table
    protected $returnType    = 'App\Entities\Feed';  // Entity class name
    protected $useTimestamps = true;         // Auto handle timestamps
    protected $allowedFields = ['title'];  // Fields that can be manipulated

    // Optional: Define validation rules
    protected $validationRules    = [
        'title' => 'required',
    ];
    
        
    public function getUnreadCount($user_id, $course_id = null) {
        $this->db = \Config\Database::connect();

        $builder = $this->db->table('notification');
        $builder->select('COUNT(notification.id) as unread_count');
        $builder->join('notification_read', 'notification.id = notification_read.notification_id AND notification_read.user_id = ' . $user_id, 'left');
        $builder->where('notification_read.notification_id IS NULL'); // Exclude notifications that are read
        $builder->where('notification.deleted_at IS NULL'); // Notifications not marked as deleted
        $builder->whereIn('notification.course_id', [$course_id, 0]); // Include course-specific and general notifications
        $query = $builder->get();
        
        return $query->getRow()->unread_count ?? 0;

    }

    public function create(array $data)
    {
        $builder = $this->db->table($this->table);

        $notificationData = [
            'title'       => $data['title'] ?? null,
            'description' => $data['description'] ?? null,
            'url'         => $data['url'] ?? null,
            'is_read'     => 0,
            'created_at'  => date('Y-m-d H:i:s'),
            'created_by'  => get_user_id(),
        ];

        $result = $builder->insert($notificationData);

        if ($result) {
            return $this->db->insertID();  // Return the inserted ID
        } else {
            return false;
        }
    }

    public function markAllAsRead()
    {
        $builder = $this->db->table($this->table);

        $notificationData = [
            'is_read'     => 1,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => get_user_id(),
        ];

        $builder->update($notificationData);

        return $this->db->affectedRows();  
    }

    public function clearAll()
    {
        $builder = $this->db->table($this->table);

        $notificationData = [
            'deleted_at'  => date('Y-m-d H:i:s'),
            'deleted_by'  => get_user_id(),
        ];

        $builder->update($notificationData);

        return $this->db->affectedRows();  
    }

    /*** Function usage Example */
    // $notification_data = [
    //     'title'      => 'New Divorse Application Added',
    //     'description' => "New divorse application added by " . get_user_name(),
    //     'url' => 'admin/applications/divorce_index?tab=2',
    // ];

    // $this->notification_model->create($notification_data);
    

}
