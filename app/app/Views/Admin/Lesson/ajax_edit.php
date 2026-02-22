<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/lesson/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
            <div class="row">
                <div class="col-lg-12 p-2">
                    <div>
                        <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                        <input type="text" class="form-control" id="title" name="title" required value="<?=$edit_data['title']?>">
                        <input type="hidden" class="form-control" id="course_id" name="course_id" value="<?=$edit_data['course_id']?>">
                    </div>
                    </div>
                </div>
                 <div class="col-lg-12 p-2 d-none">
                    <div>
                        <label for="order" class="form-label">Display Order<span class=" text-danger">*</span></label>
                        <input type="number" class="form-control" id="order" name="order"  value="<?=$edit_data['order']?>">
                    </div>
                </div>
                <div class="col-12 form-group p-2 ">
                    <label for="subject_id" class="form-label">Subject<span class="required text-danger">*</span></label>
                    <select class="form-control select2" name="subject_id" id="subject_id" required>
                        <option value="0">None</option>
                        <?php foreach($subjects as $val){ ?>
                        <option value="<?=$val['id']?>"  <?php if($edit_data["subject_id"]==$val['id'])echo "selected"; ?>   ><?=$val['title']?></option>
                        <?php } ?>
                    </select>
                </div>
                
                <div class="col-lg-12 p-2">
                        <div>
                            <label for="thumbnail" class="form-label">Thumbnail (600x600)</label>
                            <input type="file" class="form-control" id="thumbnail" name="thumbnail" >
                        </div>
                    </div>
                
                 <div class="col-lg-12 p-2">
            <div>
                <label for="summary" class="form-label">Summary<span class="required text-danger">*</span></label>
                <textarea class="form-control" id="summary" name="summary" required><?=$edit_data['summary']?></textarea>
            </div>
        </div>
                
                <div class="col-12 p-2">
                    <button class="btn btn-success float-end btn-save" type="submit"><i class="ri-check-fill"></i>Save</button>
                </div>
            </div>
        </form>
        <?php
    }
?>