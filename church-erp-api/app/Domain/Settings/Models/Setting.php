<?php

namespace App\Domain\Settings\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = ['key', 'value', 'type'];
}
